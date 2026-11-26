<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Models\DealImage;
use App\Models\DealStatusHistory;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class LearnerDealController extends Controller
{
    /**
     * Get deals with tabs (Verified Deals vs All Deals)
     */
    public function index(Request $request)
    {
        try {
            $listingKind = $this->resolveListingKind($request);

            $query = Deal::query()
                ->with(['user:id,first_name,last_name,email', 'dealImages']);

            $tab = $request->get('tab', 'all');

            if ($listingKind === Deal::LISTING_KIND_REVIEW) {
                // Deal Review: owner-only; stays here even after send-to-marketplace
                $query->where('listing_kind', Deal::LISTING_KIND_REVIEW)
                      ->where('created_by', auth()->id());

                if ($tab === 'pending') {
                    $query->whereIn('status', [Deal::STATUS_PENDING, Deal::STATUS_RESUBMITTED]);
                } elseif ($tab === 'rejected') {
                    $query->where('status', Deal::STATUS_REJECTED);
                } elseif ($tab === 'verified') {
                    $query->where('status', Deal::STATUS_VERIFIED);
                }
                // default / my_deals / all: all of this learner's review deals
            } elseif ($tab === 'featured') {
                // Public feed includes review deals that were sent to marketplace
                $query->published()->where('featured', true);
            } elseif ($tab === 'my_deals') {
                $query->where('listing_kind', Deal::LISTING_KIND_MARKETPLACE)
                      ->where('created_by', auth()->id());
            } elseif ($tab === 'pending') {
                $query->where('listing_kind', Deal::LISTING_KIND_MARKETPLACE)
                      ->where('created_by', auth()->id())
                      ->whereIn('status', [Deal::STATUS_PENDING, Deal::STATUS_RESUBMITTED]);
            } elseif ($tab === 'rejected') {
                $query->where('listing_kind', Deal::LISTING_KIND_MARKETPLACE)
                      ->where('created_by', auth()->id())
                      ->where('status', Deal::STATUS_REJECTED);
            } else {
                // Default marketplace: all publicly listed deals (any origin)
                $query->published();
            }

            // Apply search
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('location', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('property_type', 'like', "%{$search}%");
                });
            }

            // Filter by property type
            if ($request->has('property_type') && $request->property_type !== 'all') {
                $query->where('property_type', $request->property_type);
            }

            // Filter by price range
            if ($request->has('min_price')) {
                $query->where('price', '>=', $request->min_price);
            }
            if ($request->has('max_price')) {
                $query->where('price', '<=', $request->max_price);
            }

            // Filter by ROI range
            if ($request->has('min_roi')) {
                $query->where('roi', '>=', $request->min_roi);
            }

            // Filter by location
            if ($request->has('location') && $request->location) {
                $query->where('location', 'like', "%{$request->location}%");
            }

            // Filter featured deals
            if ($request->boolean('featured')) {
                $query->where('featured', true);
            }

            // Sorting options
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            
            $validSortColumns = ['published_at', 'price', 'roi', 'views', 'created_at'];
            if (in_array($sortBy, $validSortColumns)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->orderBy('created_at', 'desc');
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $deals = $query->paginate($perPage);

            // Transform deals to include images array
            $deals->getCollection()->transform(function ($deal) {
                return $this->transformDeal($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Deals retrieved successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to retrieve deals: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deals: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single deal with full details and verification history
     */
    public function show($id)
    {
        try {
            $deal = Deal::with([
                'user:id,first_name,last_name,email',
                'histories.user:id,first_name,last_name,role',
                'dealImages'
            ])->find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found'
                ], 404);
            }

            // Security: public marketplace deals, own deals, or admin viewing any deal
            $user = Auth::user();
            $isOwner = $deal->created_by === Auth::id();
            $isAdmin = $user && $user->isAdmin();
            if (!$isOwner && !$isAdmin && !$deal->isPubliclyVisible()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied to this deal'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal retrieved successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to retrieve deal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new deal (Learner workflow) - Supports multiple images
     */
    public function store(Request $request)
    {
        try {
            $request->merge($this->normalizeDealInput($request));

            $validator = Validator::make(
                $request->all(),
                $this->dealValidationRules(),
                $this->dealValidationMessages()
            );

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator);
            }

            $data = $request->only([
                'title', 'location', 'price', 'roi',
                'description', 'property_type', 'occupancy'
            ]);

            // Set default status: If status is explicitly passed as DRAFT, set it, otherwise PENDING
            $targetStatus = Deal::STATUS_PENDING;
            if ($request->input('status') === Deal::STATUS_DRAFT) {
                $targetStatus = Deal::STATUS_DRAFT;
            }

            $listingKind = $this->resolveListingKind($request);

            $data['status'] = $targetStatus;
            $data['listing_kind'] = $listingKind;
            $data['submitted_by_role'] = 'LEARNER';
            $data['created_by'] = Auth::id();
            $data['views'] = 0;
            $data['inquiries'] = 0;

            $deal = Deal::create($data);

            // Handle multiple images
            if ($request->hasFile('images')) {
                $this->handleMultipleImages($request, $deal);
            } elseif ($request->filled('image_path')) {
                $this->handleSingleImagePath($request, $deal);
            } elseif ($request->hasFile('image')) {
                $this->handleSingleImageFile($request, $deal);
            }

            // Record initial history
            $deal->histories()->create([
                'old_status' => 'NONE',
                'new_status' => $deal->status,
                'note' => 'Deal created by learner',
                'changed_by' => Auth::id()
            ]);

            $deal->load(['user:id,first_name,last_name,email', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal created and submitted successfully'
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to create deal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a deal (support editing draft or rejected deals and resubmitting) - Supports multiple images
     */
    public function update(Request $request, $id)
    {
        try {
            $deal = Deal::with('dealImages')->find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found'
                ], 404);
            }

            if ($deal->status === Deal::STATUS_CLOSED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Closed deals cannot be edited.'
                ], 422);
            }

            $editableStatuses = [Deal::STATUS_DRAFT, Deal::STATUS_REJECTED];
            if (!in_array($deal->status, $editableStatuses, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Verified and pending deals cannot be edited.'
                ], 422);
            }

            // Learners can only edit their own deals
            if ($deal->created_by !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to edit this deal'
                ], 403);
            }

            $request->merge($this->normalizeDealInput($request));

            $validator = Validator::make(
                $request->all(),
                $this->dealValidationRules(true),
                $this->dealValidationMessages()
            );

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator);
            }

            $data = $request->only([
                'title', 'location', 'price', 'roi',
                'description', 'property_type', 'occupancy'
            ]);

            $oldStatus = $deal->status;
            $newStatus = $oldStatus;

            // Handle images - delete existing and add new if provided
            if ($request->hasFile('images')) {
                // Delete old images
                foreach ($deal->dealImages as $oldImage) {
                    MediaStorage::delete($oldImage->image_url);
                    $oldImage->delete();
                }
                $this->handleMultipleImages($request, $deal);
            } elseif ($request->filled('image_path')) {
                // Delete old images
                foreach ($deal->dealImages as $oldImage) {
                    MediaStorage::delete($oldImage->image_url);
                    $oldImage->delete();
                }
                $this->handleSingleImagePath($request, $deal);
            } elseif ($request->hasFile('image')) {
                // Delete old images
                foreach ($deal->dealImages as $oldImage) {
                    MediaStorage::delete($oldImage->image_url);
                    $oldImage->delete();
                }
                $this->handleSingleImageFile($request, $deal);
            }

            // Learner Workflow status flow transitions:
            // If the deal was rejected, editing and saving automatically resubmits it
            if ($oldStatus === Deal::STATUS_REJECTED) {
                $newStatus = Deal::STATUS_RESUBMITTED;
                $data['rejection_note'] = null; // Clear rejection note on resubmission
            } elseif ($oldStatus === Deal::STATUS_DRAFT && $request->input('status') === Deal::STATUS_PENDING) {
                $newStatus = Deal::STATUS_PENDING;
            }

            $data['status'] = $newStatus;
            $deal->update($data);

            if ($oldStatus !== $newStatus) {
                // Record status change history
                $deal->histories()->create([
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'note' => $newStatus === Deal::STATUS_RESUBMITTED ? 'Deal edited and resubmitted for approval' : 'Deal submitted for approval',
                    'changed_by' => Auth::id()
                ]);
            }

            $deal->load(['user:id,first_name,last_name,email', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update deal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a deal - Also deletes all associated images
     */
    public function destroy($id)
    {
        try {
            $deal = Deal::with('dealImages')->find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found'
                ], 404);
            }

            if ($deal->created_by !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to delete this deal'
                ], 403);
            }

            if (in_array($deal->status, [Deal::STATUS_VERIFIED], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Verified deals cannot be deleted.'
                ], 422);
            }

            // Delete all associated images
            foreach ($deal->dealImages as $image) {
                MediaStorage::delete($image->image_url);
                $image->delete();
            }

            // Delete legacy image
            if ($deal->image_url) {
                MediaStorage::delete($deal->image_url);
            }

            $deal->delete();

            return response()->json([
                'success' => true,
                'message' => 'Deal deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete deal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get featured deals
     */
    public function featured(Request $request)
    {
        try {
            $query = Deal::query()
                ->with(['user:id,first_name,last_name,email', 'dealImages'])
                ->published()
                ->where('featured', true)
                ->orderBy('published_at', 'desc');

            $perPage = $request->get('per_page', 6);
            $deals = $query->paginate($perPage);

            $deals->getCollection()->transform(function ($deal) {
                return $this->transformDeal($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Featured deals retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve featured deals: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Record an inquiry for a deal
     */
    public function inquiry($id, Request $request)
    {
        try {
            $deal = Deal::find($id);

            if (!$deal || !$deal->isPubliclyVisible()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found or not available'
                ], 404);
            }

            $validated = $request->validate([
                'contact_type' => 'required|in:call,message',
                'message' => 'nullable|string|max:2000',
            ]);

            $contactType = $validated['contact_type'];
            $deal->increment('inquiries');

            $responseMessage = match ($contactType) {
                'call' => 'Call request sent successfully.',
                default => 'Message sent successfully.',
            };

            return response()->json([
                'success' => true,
                'data' => [
                    'deal_id' => $deal->id,
                    'inquiries' => $deal->fresh()->inquiries,
                    'contact_type' => $contactType,
                    'counted' => true,
                ],
                'message' => $responseMessage,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to record inquiry: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Record a view for a deal
     */
    public function recordView($id)
    {
        try {
            $deal = Deal::find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found or not available',
                ], 404);
            }

            // Owner previews should not inflate view counts
            if ((int) $deal->created_by === (int) Auth::id()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'deal_id' => $deal->id,
                        'views' => $deal->views,
                        'counted' => false,
                    ],
                    'message' => 'Owner view not counted.',
                ]);
            }

            // Public views require marketplace visibility
            if (!$deal->isPubliclyVisible()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found or not available',
                ], 404);
            }

            $deal->increment('views');

            return response()->json([
                'success' => true,
                'data' => [
                    'deal_id' => $deal->id,
                    'views' => $deal->fresh()->views,
                    'counted' => true,
                ],
                'message' => 'Deal view recorded successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to record view: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get deal statistics
     */
    public function stats()
    {
        try {
            $totalDeals = Deal::published()->count();
            $avgROI = Deal::published()->avg('roi');
            
            $dealsByType = Deal::published()
                ->selectRaw('property_type, COUNT(*) as count')
                ->groupBy('property_type')
                ->get();

            $recentDeals = Deal::published()
                ->where('published_at', '>=', now()->subDays(7))
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_deals' => $totalDeals,
                    'average_roi' => round($avgROI ?? 0, 2),
                    'deals_by_type' => $dealsByType,
                    'recent_deals' => $recentDeals,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve stats: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get filter options
     */
    public function filterOptions()
    {
        try {
            $locations = Deal::published()
                ->distinct()
                ->pluck('location')
                ->filter()
                ->values();

            $minPrice = Deal::published()->min('price');
            $maxPrice = Deal::published()->max('price');
            $minROI = Deal::published()->min('roi');
            $maxROI = Deal::published()->max('roi');

            return response()->json([
                'success' => true,
                'data' => [
                    'property_types' => [
                        'commercial' => 'Commercial',
                        'residential' => 'Residential',
                        'industrial' => 'Industrial',
                        'retail' => 'Retail',
                        'mixed-use' => 'Mixed Use',
                    ],
                    'locations' => $locations,
                    'price_range' => [
                        'min' => $minPrice ?? 0,
                        'max' => $maxPrice ?? 0,
                    ],
                    'roi_range' => [
                        'min' => $minROI ?? 0,
                        'max' => $maxROI ?? 0,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve filter options: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Publish a verified deal (learner)
     */
    public function publish($id)
    {
        try {
            $deal = Deal::with('dealImages')->find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found'
                ], 404);
            }

            if ($deal->created_by !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to publish this deal'
                ], 403);
            }

            if ($deal->status !== Deal::STATUS_VERIFIED) {
                return response()->json([
                    'success' => false,
                    'message' => 'This deal must be verified by an admin before it can be published.'
                ], 422);
            }

            if ($deal->listing_kind === Deal::LISTING_KIND_REVIEW) {
                return response()->json([
                    'success' => false,
                    'message' => 'Use Send to Marketplace for approved deal reviews.'
                ], 422);
            }

            if ($deal->published_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'This deal is already published.'
                ], 422);
            }

            $deal->update(['published_at' => now()]);

            // Record history
            $deal->histories()->create([
                'old_status' => Deal::STATUS_VERIFIED,
                'new_status' => Deal::STATUS_VERIFIED,
                'note' => 'Deal published by owner',
                'changed_by' => Auth::id()
            ]);

            $deal->load(['user:id,first_name,last_name,email', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal published successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to publish deal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to publish deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get deals by a specific mentor/user
     */
    public function byMentor($mentorId, Request $request)
    {
        try {
            $query = Deal::query()
                ->with(['user:id,first_name,last_name,email', 'dealImages'])
                ->published()
                ->where('created_by', $mentorId)
                ->orderBy('published_at', 'desc');

            $perPage = $request->get('per_page', 12);
            $deals = $query->paginate($perPage);

            $deals->getCollection()->transform(function ($deal) {
                return $this->transformDeal($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Deals by mentor retrieved successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve deals by mentor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deals by mentor: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Send an approved Deal Review to the public Deal Marketplace.
     */
    public function sendToMarketplace($id)
    {
        try {
            $deal = Deal::with('dealImages')->find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found',
                ], 404);
            }

            if ($deal->created_by !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to send this deal to marketplace',
                ], 403);
            }

            if ($deal->listing_kind !== Deal::LISTING_KIND_REVIEW) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only deal reviews can be sent to the marketplace.',
                ], 422);
            }

            if ($deal->status !== Deal::STATUS_VERIFIED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal review must be approved by an admin before sending to marketplace.',
                ], 422);
            }

            if ($deal->published_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'This deal review is already listed on the marketplace.',
                ], 422);
            }

            // Keep listing_kind=review so it remains visible in Deal Review,
            // and publish it so it also appears in the public marketplace.
            $deal->update([
                'published_at' => now(),
            ]);

            $deal->histories()->create([
                'old_status' => Deal::STATUS_VERIFIED,
                'new_status' => Deal::STATUS_VERIFIED,
                'note' => 'Deal review sent to marketplace by owner',
                'changed_by' => Auth::id(),
            ]);

            $deal->load(['user:id,first_name,last_name,email', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal sent to marketplace successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send deal to marketplace: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send deal to marketplace: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Handle multiple image uploads
     */
    private function handleMultipleImages(Request $request, Deal $deal): void
    {
        $images = $request->file('images');
        if (!is_array($images)) {
            $images = [$images];
        }

        foreach ($images as $index => $image) {
            $imageName = 'deal_' . Str::random(20) . '_' . time() . '_' . $index . '.' . $image->getClientOriginalExtension();
            $imagePath = MediaStorage::storeAs('deals', $imageName, $image);
            
            DealImage::create([
                'deal_id' => $deal->id,
                'image_url' => $imagePath,
                'order' => $index,
                'is_primary' => $index === 0,
            ]);
        }

        // Set first image as the legacy image_url for backward compatibility
        $firstImage = $deal->dealImages()->orderBy('order')->first();
        if ($firstImage) {
            $deal->update(['image_url' => $firstImage->image_url]);
        }
    }

    /**
     * Handle single image from path
     */
    private function handleSingleImagePath(Request $request, Deal $deal): void
    {
        $imagePath = DirectUpload::resolvePath($request, 'image_path');
        if ($imagePath instanceof \Illuminate\Http\JsonResponse) {
            return;
        }
        
        DealImage::create([
            'deal_id' => $deal->id,
            'image_url' => $imagePath,
            'order' => 0,
            'is_primary' => true,
        ]);
        
        $deal->update(['image_url' => $imagePath]);
    }

    /**
     * Handle single image file
     */
    private function handleSingleImageFile(Request $request, Deal $deal): void
    {
        $image = $request->file('image');
        $imageName = 'deal_' . Str::random(20) . '.' . $image->getClientOriginalExtension();
        $imagePath = MediaStorage::storeAs('deals', $imageName, $image);
        
        DealImage::create([
            'deal_id' => $deal->id,
            'image_url' => $imagePath,
            'order' => 0,
            'is_primary' => true,
        ]);
        
        $deal->update(['image_url' => $imagePath]);
    }

    /**
     * Transform deal for API response
     */
    private function transformDeal($deal): array
    {
        $images = $deal->dealImages->pluck('image_url')->toArray();
        $imageUrls = $deal->dealImages->map(function ($image) {
            return MediaUrl::url($image->image_url);
        })->toArray();

        return [
            'id' => $deal->id,
            'title' => $deal->title,
            'location' => $deal->location,
            'price' => $deal->price,
            'roi' => $deal->roi,
            'status' => $deal->status,
            'listing_kind' => $deal->listing_kind,
            'rejection_note' => $deal->rejection_note,
            'property_type' => $deal->property_type,
            'image_url' => $deal->image_url ? MediaUrl::url($deal->image_url) : null,
            'images' => $images,
            'image_urls' => $imageUrls,
            'featured' => (bool) $deal->featured,
            'views' => $deal->views,
            'inquiries' => $deal->inquiries,
            'description' => $deal->description,
            'occupancy' => $deal->occupancy,
            'cash_flow' => $this->calculateCashFlow($deal),
            'published_at' => $deal->published_at,
            'created_at' => $deal->created_at,
            'user' => $deal->user ? [
                'id' => $deal->user->id,
                'first_name' => $deal->user->first_name,
                'last_name' => $deal->user->last_name,
                'email' => $deal->user->email,
            ] : null,
            'histories' => $deal->histories ? $deal->histories->map(function ($history) {
                return [
                    'old_status' => $history->old_status,
                    'new_status' => $history->new_status,
                    'note' => $history->note,
                    'created_at' => $history->created_at,
                    'user' => $history->user ? [
                        'id' => $history->user->id,
                        'first_name' => $history->user->first_name,
                        'last_name' => $history->user->last_name,
                    ] : null,
                ];
            }) : [],
        ];
    }

    /**
     * Calculate cash flow (placeholder logic)
     */
    private function calculateCashFlow($deal): float
    {
        // This is a placeholder - implement your actual cash flow calculation
        return ($deal->price ?? 0) * 0.005;
    }

    /**
     * Resolve listing kind from request
     */
    private function resolveListingKind(Request $request): string
    {
        // Prefer explicit param, otherwise infer from dedicated deal-review routes
        $kind = $request->input('listing_kind');

        if (!is_string($kind) || $kind === '') {
            $path = $request->path();
            $kind = str_contains($path, 'deal-review')
                ? Deal::LISTING_KIND_REVIEW
                : Deal::LISTING_KIND_MARKETPLACE;
        }

        return in_array($kind, [Deal::LISTING_KIND_MARKETPLACE, Deal::LISTING_KIND_REVIEW], true)
            ? $kind
            : Deal::LISTING_KIND_MARKETPLACE;
    }

    /**
     * Validation rules
     */
    private function dealValidationRules(bool $forUpdate = false): array
    {
        $prefix = $forUpdate ? 'sometimes|' : '';

        return [
            'title' => $prefix . 'required|string|max:255',
            'location' => $prefix . 'required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'roi' => 'nullable|numeric|min:0|max:100',
            'description' => 'nullable|string',
            'property_type' => 'nullable|in:commercial,residential,industrial,retail,mixed-use',
            'occupancy' => 'nullable|numeric|min:0|max:100',
            'images' => 'nullable|array|max:10',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_path' => 'nullable|string|max:500',
            'listing_kind' => 'nullable|in:marketplace,review',
        ];
    }

    /**
     * Validation messages
     */
    private function dealValidationMessages(): array
    {
        return [
            'title.required' => 'Deal title is required.',
            'title.max' => 'Deal title cannot exceed 255 characters.',
            'location.required' => 'Location is required.',
            'location.max' => 'Location cannot exceed 255 characters.',
            'price.min' => 'Price cannot be negative.',
            'price.numeric' => 'Price must be a number.',
            'roi.max' => 'ROI cannot exceed 100%.',
            'roi.min' => 'ROI cannot be negative.',
            'roi.numeric' => 'ROI must be a number.',
            'property_type.in' => 'Please select a valid property type.',
            'occupancy.max' => 'Occupancy cannot exceed 100%.',
            'occupancy.min' => 'Occupancy cannot be negative.',
            'occupancy.numeric' => 'Occupancy must be a number.',
            'images.*.image' => 'Each uploaded file must be a valid image.',
            'images.*.mimes' => 'Images must be JPEG, PNG, JPG, GIF, or WebP files.',
            'images.*.max' => 'Each image cannot exceed 5 MB.',
            'images.max' => 'You can upload a maximum of 10 images.',
            'image.image' => 'Deal image must be a valid image file.',
            'image.mimes' => 'Deal image must be a JPEG, PNG, JPG, or GIF file.',
            'image.max' => 'Deal image cannot exceed 5 MB.',
        ];
    }

    /**
     * Normalize deal input
     */
    private function normalizeDealInput(Request $request): array
    {
        $input = $request->all();
        $numericFields = ['price', 'roi', 'occupancy'];

        foreach ($numericFields as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }

            $value = $input[$field];
            if ($value === null || $value === '') {
                $input[$field] = null;
                continue;
            }

            $cleaned = preg_replace('/[^\d.-]/', '', (string) $value);
            $input[$field] = $cleaned === '' ? null : $cleaned;
        }

        if (array_key_exists('description', $input)) {
            $input['description'] = trim((string) $input['description']);
            if ($input['description'] === '') {
                $input['description'] = null;
            }
        }

        if (array_key_exists('property_type', $input) && ($input['property_type'] === '' || $input['property_type'] === null)) {
            $input['property_type'] = null;
        }

        if (array_key_exists('title', $input)) {
            $input['title'] = trim((string) $input['title']);
        }

        if (array_key_exists('location', $input)) {
            $input['location'] = trim((string) $input['location']);
        }

        return $input;
    }

    /**
     * Validation error response
     */
    private function validationErrorResponse($validator)
    {
        $errors = $validator->errors();

        return response()->json([
            'success' => false,
            'message' => $errors->first() ?: 'Please fix the highlighted fields.',
            'errors' => $errors->toArray(),
        ], 422);
    }
}