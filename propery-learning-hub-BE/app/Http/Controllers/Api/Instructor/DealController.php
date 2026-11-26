<?php

namespace App\Http\Controllers\Api\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Models\DealImage;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class DealController extends Controller
{

    /**
     * Get all deals with filters
     */
    public function index(Request $request)
    {
        try {
            // Scope to the authenticated instructor's own deals only
            $query = Deal::query()
                ->with(['user:id,first_name,email', 'dealImages'])
                ->where('created_by', Auth::id())
                ->orderBy('created_at', 'desc');

            $listingKind = $request->get('listing_kind', Deal::LISTING_KIND_MARKETPLACE);
            if (in_array($listingKind, [Deal::LISTING_KIND_MARKETPLACE, Deal::LISTING_KIND_REVIEW], true)) {
                $query->where('listing_kind', $listingKind);
            }

            // Apply search
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('location', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Apply status filter
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Apply approval_status filter
            if ($request->has('approval_status') && $request->approval_status !== 'all') {
                $query->where('approval_status', $request->approval_status);
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $deals = $query->paginate($perPage);

            // Format dates in the response
            $deals->getCollection()->transform(function ($deal) {
                return $this->formatDealDates($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Deals retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deals: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get deal statistics
     */
    public function stats()
    {
        try {
            $totalDeals = Deal::count();
            $publishedDeals = Deal::where('status', 'published')->count();
            $totalViews = Deal::sum('views');
            $totalInquiries = Deal::sum('inquiries');

            // Calculate changes
            $changes = [
                'total' => '+0%',
                'published' => '+0%',
                'views' => '+0%',
                'inquiries' => '+0%',
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'total_deals' => $totalDeals,
                    'published_deals' => $publishedDeals,
                    'total_views' => $totalViews,
                    'total_inquiries' => $totalInquiries,
                    'changes' => $changes,
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
     * Store a new deal
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

            // Force draft and pending approval on creation
            $data['status'] = Deal::STATUS_DRAFT;
            $data['approval_status'] = Deal::APPROVAL_STATUS_PENDING;

            // Add user ID
            $data['created_by'] = Auth::id();

            // Initialize views and inquiries
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

            // Update timestamps based on status
            if ($deal->status === 'published') {
                $deal->update(['published_at' => now()]);
            } elseif ($deal->status === 'closed') {
                $deal->update(['closed_at' => now()]);
            }

            $deal->load(['user:id,first_name', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->formatDealDates($deal),
                'message' => 'Deal created successfully'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single deal
     */
    public function show($id)
    {
        try {
            $deal = Deal::with(['user:id,first_name,email', 'dealImages'])->find($id);

            if (!$deal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deal not found'
                ], 404);
            }

            // Increment views when accessed
            $deal->increment('views');

            return response()->json([
                'success' => true,
                'data' => $this->formatDealDates($deal),
                'message' => 'Deal retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a deal
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

            // Check authorization
            if ($deal->created_by !== (int) Auth::id() && !Auth::user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $request->merge($this->normalizeDealInput($request));

            $validator = Validator::make(
                $request->all(),
                $this->dealValidationRules(forUpdate: true),
                $this->dealValidationMessages()
            );

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator);
            }

            $data = $request->only([
                'title', 'location', 'price', 'roi', 'status',
                'description', 'property_type', 'occupancy'
            ]);

            // Reset approval status to pending if content is edited
            if ($deal->approval_status === Deal::APPROVAL_STATUS_REJECTED || $deal->approval_status === Deal::APPROVAL_STATUS_APPROVED) {
                $contentFields = ['title', 'location', 'price', 'roi', 'description', 'property_type', 'occupancy'];
                $hasContentChanges = false;
                foreach ($contentFields as $field) {
                    if ($request->has($field) && $request->input($field) != $deal->$field) {
                        $hasContentChanges = true;
                        break;
                    }
                }
                if ($request->hasFile('images') || $request->filled('image_path') || $request->hasFile('image')) {
                    $hasContentChanges = true;
                }

                if ($hasContentChanges) {
                    $data['approval_status'] = Deal::APPROVAL_STATUS_PENDING;
                    $data['rejection_reason'] = null;
                    // If it was published, revert it to draft
                    if ($deal->status === 'published') {
                        $data['status'] = Deal::STATUS_DRAFT;
                    }
                }
            }

            $deal->update($data);

            // Handle multiple images - delete existing and add new ones
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

            if ($deal->status === Deal::STATUS_REJECTED) {
                $deal->update(['status' => Deal::STATUS_RESUBMITTED, 'rejection_note' => null]);
            }

            $deal->load(['user:id,first_name', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->formatDealDates($deal),
                'message' => 'Deal updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a deal
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

            // Check authorization
            if ($deal->created_by !== (int) Auth::id() && !Auth::user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Delete associated images
            foreach ($deal->dealImages as $image) {
                MediaStorage::delete($image->image_url);
                $image->delete();
            }

            // Delete legacy image
            if ($deal->image_url) {
                MediaStorage::delete($deal->image_url);
            }

            $deal->histories()->delete();
            \Illuminate\Support\Facades\DB::table('deal_favorites')->where('deal_id', $deal->id)->delete();
            $deal->delete();

            return response()->json([
                'success' => true,
                'message' => 'Deal deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Publish a deal
     */
    public function publish(Deal $deal)
    {
        try {
            if ($deal->created_by !== (int) Auth::id() && !Auth::user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            if (!$deal->isApproved()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This deal must be approved by an admin before it can be published.'
                ], 422);
            }

            $deal->markAsPublished();
            $deal->load(['user:id,first_name', 'dealImages']);

            return response()->json([
                'success' => true,
                'message' => 'Deal published successfully',
                'data' => $this->formatDealDates($deal->fresh()),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to publish deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Close a deal
     */
    public function close(Deal $deal)
    {
        try {
            if ($deal->created_by !== (int) Auth::id() && !Auth::user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $deal->markAsClosed();
            $deal->load(['user:id,first_name', 'dealImages']);

            return response()->json([
                'success' => true,
                'message' => 'Deal closed successfully',
                'data' => $this->formatDealDates($deal->fresh()),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to close deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle featured status for learner deal room highlights.
     */
    public function toggleFeatured(Deal $deal)
    {
        try {
            if ($deal->created_by !== (int) Auth::id() && !Auth::user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Accept VERIFIED and legacy "published" rows (pre-workflow migration).
            $status = strtoupper((string) $deal->status);
            if ($status !== Deal::STATUS_VERIFIED && $status !== 'PUBLISHED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only verified deals can be featured',
                ], 422);
            }

            $listingKind = $deal->listing_kind ?: Deal::LISTING_KIND_MARKETPLACE;
            if ($listingKind !== Deal::LISTING_KIND_MARKETPLACE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only marketplace deals can be featured',
                ], 422);
            }

            if ($deal->published_at === null) {
                $deal->published_at = now();
            }

            // Use raw DB value — PHP (bool)"0" is true and breaks toggles intermittently.
            $rawFeatured = $deal->getAttributes()['featured'] ?? $deal->getRawOriginal('featured') ?? 0;
            $currentlyFeatured = in_array($rawFeatured, [1, '1', true, 'true'], true);
            $deal->featured = ! $currentlyFeatured;
            if ($deal->listing_kind === null || $deal->listing_kind === '') {
                $deal->listing_kind = Deal::LISTING_KIND_MARKETPLACE;
            }
            $deal->save();
            $deal->refresh();
            $deal->load(['user:id,first_name', 'dealImages']);

            return response()->json([
                'success' => true,
                'message' => $deal->featured ? 'Deal marked as featured' : 'Deal removed from featured',
                'data' => $this->formatDealDates($deal),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to toggle featured status: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get deals created by the authenticated instructor
     */
    public function myDeals(Request $request)
    {
        try {
            $query = Deal::with('dealImages')
                ->where('created_by', Auth::id())
                ->orderBy('created_at', 'desc');

            // Apply search
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('location', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Apply status filter
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $deals = $query->paginate($perPage);

            // Format dates in the response
            $deals->getCollection()->transform(function ($deal) {
                return $this->formatDealDates($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Your deals retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve your deals: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Increment inquiries counter
     */
    public function incrementInquiries($id)
    {
        // Email / legacy inquiry bumps are disabled — only call/message via
        // LearnerDealController::inquiry should increment counts.
        return response()->json([
            'success' => false,
            'message' => 'This endpoint no longer increments inquiry counts. Use call or in-app message contact instead.',
        ], 410);
    }

    /**
     * Get property types and status options
     */
    public function getOptions()
    {
        try {
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
                    'status_options' => [
                        'draft' => 'Draft',
                        'published' => 'Published',
                        'closed' => 'Closed',
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve options: ' . $e->getMessage(),
                'error' => $e->getMessage()
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
        if ($images && count($images) > 0) {
            $firstImage = $deal->dealImages()->orderBy('order')->first();
            if ($firstImage) {
                $deal->update(['image_url' => $firstImage->image_url]);
            }
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
     * Format all date fields in a deal to dd/mm/yyyy format
     */
    private function formatDealDates($deal)
    {
        if (!$deal) {
            return $deal;
        }

        $dateFields = ['created_at', 'updated_at', 'published_at', 'closed_at'];
        
        foreach ($dateFields as $field) {
            if ($deal->$field) {
                try {
                    $deal->$field = \Carbon\Carbon::parse($deal->$field)->format('d/m/Y');
                } catch (\Exception $e) {
                    // If date parsing fails, keep original value
                }
            }
        }

        return $deal;
    }

    private function dealValidationRules(bool $forUpdate = false): array
    {
        $prefix = $forUpdate ? 'sometimes|' : '';

        return [
            'title' => $prefix . 'required|string|max:255',
            'location' => $prefix . 'required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'roi' => 'nullable|numeric|min:0|max:100',
            'status' => ($forUpdate ? 'sometimes|' : 'nullable|') . 'in:draft,published,closed',
            'description' => 'nullable|string',
            'property_type' => 'nullable|in:commercial,residential,industrial,retail,mixed-use',
            'occupancy' => 'nullable|numeric|min:0|max:100',
            'images' => 'nullable|array|max:10',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'image_path' => 'nullable|string|max:500',
        ];
    }

    private function dealValidationMessages(): array
    {
        return [
            'title.required' => 'Deal title is required.',
            'title.max' => 'Deal title cannot exceed 255 characters.',
            'location.required' => 'Location is required.',
            'location.max' => 'Location cannot exceed 255 characters.',
            'price.numeric' => 'Price must be a number.',
            'price.min' => 'Price cannot be negative.',
            'roi.max' => 'ROI cannot exceed 100%.',
            'roi.min' => 'ROI cannot be negative.',
            'roi.numeric' => 'ROI must be a number.',
            'status.in' => 'Please select a valid status.',
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

    private function normalizeDealInput(Request $request): array
    {
        return $this->normalizeDealInputArray($request->all());
    }

    private function normalizeDealInputArray(array $input): array
    {
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

        return $input;
    }

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