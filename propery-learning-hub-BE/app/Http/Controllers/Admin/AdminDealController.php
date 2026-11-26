<?php

namespace App\Http\Controllers\Admin;

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

class AdminDealController extends Controller
{
    /**
     * List all deals for administration
     */
    public function index(Request $request)
    {
        try {
            $query = Deal::query()
                ->with(['user:id,first_name,last_name,email', 'verifiedBy:id,first_name,last_name', 'dealImages'])
                ->orderBy('created_at', 'desc');

            $listingKind = $this->resolveListingKind($request);

            if ($listingKind === Deal::LISTING_KIND_REVIEW) {
                // Keep review-origin deals here even after send-to-marketplace.
                // Also include any legacy rows that were flipped to marketplace after send.
                $query->where(function ($q) {
                    $q->where('listing_kind', Deal::LISTING_KIND_REVIEW)
                      ->orWhere(function ($legacy) {
                          $legacy->where('listing_kind', Deal::LISTING_KIND_MARKETPLACE)
                              ->whereNotNull('published_at')
                              ->whereHas('histories', function ($h) {
                                  $h->where('note', 'like', '%sent to marketplace%');
                              });
                      });
                });
            } else {
                $query->where('listing_kind', $listingKind);
            }

            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('location', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $tab = $request->get('tab', 'all');

            if ($tab === 'my_deals') {
                $query->where('created_by', auth()->id());
            } elseif ($tab === 'pending') {
                $query->whereIn('status', [Deal::STATUS_PENDING, Deal::STATUS_RESUBMITTED]);
            } elseif ($tab === 'rejected') {
                $query->where('status', Deal::STATUS_REJECTED);
            } elseif ($tab === 'verified') {
                $query->where('status', Deal::STATUS_VERIFIED);
                // On Deal Review, "Approved" = private approved (not yet sent to marketplace)
                if ($listingKind === Deal::LISTING_KIND_REVIEW) {
                    $query->whereNull('published_at');
                }
            } elseif ($tab === 'in_marketplace') {
                $query->where('status', Deal::STATUS_VERIFIED)
                      ->whereNotNull('published_at');
            } elseif ($tab === 'all') {
                if ($request->has('status') && $request->status !== 'all') {
                    $query->where('status', $request->status);
                }
            }

            $perPage = $request->get('per_page', 10);
            $deals = $query->paginate($perPage);

            $deals->getCollection()->transform(function ($deal) {
                return $this->transformDeal($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Deals retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deals: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List pending and resubmitted deals
     */
    public function pendingDeals(Request $request)
    {
        try {
            $query = Deal::query()
                ->with(['user:id,first_name,last_name,email', 'dealImages'])
                ->whereIn('status', [Deal::STATUS_PENDING, Deal::STATUS_RESUBMITTED])
                ->orderBy('created_at', 'desc');

            $listingKind = $this->resolveListingKind($request);
            $query->where('listing_kind', $listingKind);

            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('location', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 10);
            $deals = $query->paginate($perPage);

            $deals->getCollection()->transform(function ($deal) {
                return $this->transformDeal($deal);
            });

            return response()->json([
                'success' => true,
                'data' => $deals,
                'message' => 'Pending deals retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve pending deals: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show a single deal for admin editing
     */
    public function show(Deal $deal)
    {
        try {
            $deal->load(['user:id,first_name,last_name,email', 'verifiedBy:id,first_name,last_name', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch deal: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch deal.',
            ], 500);
        }
    }

    /**
     * Store a new deal directly from admin panel
     */
    public function store(Request $request)
    {
        try {
            $normalized = $this->normalizeDealInput($request);
            $publishImmediately = $this->parsePublishImmediately($normalized);
            $validationPayload = $this->validationPayload($request, $normalized);

            // images.* validation needs the actual UploadedFile instances, not the
            // string-normalized payload, so validate those directly off the request.
            $validator = Validator::make(
                array_merge($validationPayload, ['images' => $request->file('images')]),
                $this->dealValidationRules(),
                $this->dealValidationMessages()
            );

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator);
            }

            $data = collect($validationPayload)->only([
                'title', 'location', 'price', 'roi',
                'description', 'property_type', 'occupancy',
            ])->toArray();
            $targetStatus = $publishImmediately ? Deal::STATUS_VERIFIED : Deal::STATUS_DRAFT;

            $listingKind = $this->resolveListingKind($request);

            $data['status'] = $targetStatus;
            $data['listing_kind'] = $listingKind;
            $data['submitted_by_role'] = 'ADMIN';
            $data['created_by'] = Auth::id();
            $data['views'] = 0;
            $data['inquiries'] = 0;

            if ($targetStatus === Deal::STATUS_VERIFIED) {
                $data['verified_at'] = now();
                $data['verified_by'] = Auth::id();
                if ($listingKind !== Deal::LISTING_KIND_REVIEW) {
                    $data['published_at'] = now();
                }
            }

            $deal = Deal::create($data);

            // Handle images: support multi-image upload (images[]), legacy single
            // image file, and direct-upload image_path — in that priority order.
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
                'note' => $targetStatus === Deal::STATUS_VERIFIED ? 'Deal created and verified immediately by admin' : 'Deal created as draft by admin',
                'changed_by' => Auth::id()
            ]);

            $deal->load(['user:id,first_name,last_name,email', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal created successfully'
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to create deal by admin: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update/edit a deal by admin
     */
     public function update(Request $request, Deal $deal)
    {
        try {
            if ($deal->status === Deal::STATUS_CLOSED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Closed deals cannot be edited.'
                ], 422);
            }

            $normalized = $this->normalizeDealInput($request);
            $publishImmediately = $this->parsePublishImmediately($normalized);
            $validationPayload = $this->validationPayload($request, $normalized);

            $validator = Validator::make(
                array_merge($validationPayload, ['images' => $request->file('images')]),
                $this->dealValidationRules(true),
                $this->dealValidationMessages()
            );

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator);
            }

            $data = collect($validationPayload)->only([
                'title', 'location', 'price', 'roi',
                'description', 'property_type', 'occupancy',
            ])->toArray();

            $oldStatus = $deal->status;
            $newStatus = $oldStatus;

            if ($request->has('status')) {
                $reqStatus = $request->input('status');
                if (in_array($reqStatus, [Deal::STATUS_DRAFT, Deal::STATUS_VERIFIED, Deal::STATUS_CLOSED], true)) {
                    $newStatus = $reqStatus;
                }
            } elseif ($publishImmediately && in_array($oldStatus, [
                Deal::STATUS_DRAFT,
                Deal::STATUS_PENDING,
                Deal::STATUS_RESUBMITTED,
            ], true)) {
                $newStatus = Deal::STATUS_VERIFIED;
            }

            $data['status'] = $newStatus;
            if ($newStatus === Deal::STATUS_VERIFIED && $oldStatus !== Deal::STATUS_VERIFIED) {
                $data['verified_at'] = now();
                $data['verified_by'] = Auth::id();
                if ($deal->listing_kind !== Deal::LISTING_KIND_REVIEW) {
                    $data['published_at'] = now();
                }
            }

            $deal->update($data);

            // ── Handle images ──
            // Load current images
            $deal->load('dealImages');
            $currentImages = $deal->dealImages->pluck('image_url')->toArray();

            // 1. Handle images to delete
            if ($request->has('delete_images')) {
                $imagesToDelete = is_array($request->input('delete_images')) 
                    ? $request->input('delete_images') 
                    : [$request->input('delete_images')];
                
                foreach ($imagesToDelete as $imageUrl) {
                    // Find the image record
                    $imageRecord = $deal->dealImages()->where('image_url', $imageUrl)->first();
                    if ($imageRecord) {
                        // Delete from storage
                        MediaStorage::delete($imageRecord->image_url);
                        // Delete from database
                        $imageRecord->delete();
                    }
                }
            }

            // 2. Handle new images to add
            if ($request->hasFile('images')) {
                $newImages = $request->file('images');
                if (!is_array($newImages)) {
                    $newImages = [$newImages];
                }

                // Get current max order
                $maxOrder = $deal->dealImages()->max('order') ?? -1;

                foreach ($newImages as $index => $image) {
                    if (!$image) {
                        continue;
                    }
                    $imageName = 'deal_' . Str::random(20) . '_' . time() . '_' . ($maxOrder + $index + 1) . '.' . $image->getClientOriginalExtension();
                    $imagePath = MediaStorage::storeAs('deals', $imageName, $image);

                    DealImage::create([
                        'deal_id' => $deal->id,
                        'image_url' => $imagePath,
                        'order' => $maxOrder + $index + 1,
                        'is_primary' => $maxOrder + $index + 1 === 0,
                    ]);
                }
            }

            // 3. Handle single image path (direct upload)
            if ($request->filled('image_path')) {
                $imagePath = DirectUpload::resolvePath($request, 'image_path');
                if ($imagePath instanceof \Illuminate\Http\JsonResponse) {
                    return $imagePath;
                }

                // Check if this image already exists
                $existing = $deal->dealImages()->where('image_url', $imagePath)->first();
                if (!$existing) {
                    DealImage::create([
                        'deal_id' => $deal->id,
                        'image_url' => $imagePath,
                        'order' => $deal->dealImages()->max('order') + 1,
                        'is_primary' => $deal->dealImages()->count() === 0,
                    ]);
                }
            }

            // 4. Handle single legacy image file
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = 'deal_' . Str::random(20) . '.' . $image->getClientOriginalExtension();
                $imagePath = MediaStorage::storeAs('deals', $imageName, $image);

                DealImage::create([
                    'deal_id' => $deal->id,
                    'image_url' => $imagePath,
                    'order' => $deal->dealImages()->max('order') + 1,
                    'is_primary' => $deal->dealImages()->count() === 0,
                ]);
            }

            // 5. Update the legacy image_url field with the first image (for backward compatibility)
            $firstImage = $deal->dealImages()->orderBy('order')->first();
            if ($firstImage) {
                $deal->update(['image_url' => $firstImage->image_url]);
            } elseif ($deal->dealImages()->count() === 0) {
                // No images left, clear the image_url
                $deal->update(['image_url' => null]);
            }

            // Record status change history
            if ($oldStatus !== $newStatus) {
                $deal->histories()->create([
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'note' => 'Deal status updated during admin edit',
                    'changed_by' => Auth::id()
                ]);
            }

            $deal->fresh()->load(['user:id,first_name,last_name,email', 'dealImages']);

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal),
                'message' => 'Deal updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update deal by admin: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update deal: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a deal by admin
     */
    public function destroy(Deal $deal)
    {
        try {
            $deal->load('dealImages');

            foreach ($deal->dealImages as $image) {
                MediaStorage::delete($image->image_url);
                $image->delete();
            }

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
                'message' => 'Failed to delete deal: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle featured status for marketplace highlights.
     */
    public function toggleFeatured(Deal $deal)
    {
        try {
            $listingKind = $deal->listing_kind ?: Deal::LISTING_KIND_MARKETPLACE;
            if ($listingKind !== Deal::LISTING_KIND_MARKETPLACE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only marketplace deals can be featured',
                ], 422);
            }

            if ($deal->status === Deal::STATUS_CLOSED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Closed deals cannot be featured',
                ], 422);
            }

            $status = strtoupper((string) $deal->status);
            if ($status !== Deal::STATUS_VERIFIED && $status !== 'PUBLISHED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only verified deals can be featured',
                ], 422);
            }

            // Featured deals must be publicly visible — backfill publish date for legacy rows.
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

            return response()->json([
                'success' => true,
                'message' => $deal->featured ? 'Deal marked as featured' : 'Deal removed from featured',
                'data' => [
                    'id' => $deal->id,
                    'featured' => (bool) $deal->featured,
                    'status' => $deal->status,
                    'published_at' => $deal->published_at?->toISOString(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to toggle featured status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to toggle featured status: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve a deal
     */
    public function approveDeal(Request $request, Deal $deal)
    {
        try {
            if (!in_array($deal->status, [Deal::STATUS_PENDING, Deal::STATUS_RESUBMITTED], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending or resubmitted deals can be verified.'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'approval_note' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first(),
                    'errors' => $validator->errors()->toArray(),
                ], 422);
            }

            $note = trim((string) $request->input('approval_note', ''));
            if ($note === '') {
                $note = $deal->listing_kind === Deal::LISTING_KIND_REVIEW
                    ? 'Deal review approved by admin'
                    : 'Deal verified by admin';
            }

            $deal->transitionTo(Deal::STATUS_VERIFIED, $note, Auth::id());

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal->fresh(['user:id,first_name,last_name,email', 'verifiedBy:id,first_name,last_name', 'histories.user:id,first_name,last_name', 'dealImages'])),
                'message' => 'Deal approved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve deal: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a deal with a mandatory rejection note
     */
    public function rejectDeal(Request $request, Deal $deal)
    {
        try {
            $validator = Validator::make($request->all(), [
                'rejection_note' => 'required|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first(),
                    'errors' => $validator->errors()->toArray()
                ], 422);
            }

            $note = $request->input('rejection_note');
            $deal->transitionTo(Deal::STATUS_REJECTED, $note, Auth::id());

            return response()->json([
                'success' => true,
                'data' => $this->transformDeal($deal->fresh(['user:id,first_name,last_name,email', 'histories.user:id,first_name,last_name', 'dealImages'])),
                'message' => 'Deal rejected successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject deal: ' . $e->getMessage()
            ], 500);
        }
    }

    // =========================================================================
    // IMAGE HELPERS
    // =========================================================================

    /**
     * Handle multiple image uploads (images[] field)
     */
    private function handleMultipleImages(Request $request, Deal $deal): void
    {
        $images = $request->file('images');
        if (!is_array($images)) {
            $images = [$images];
        }

        foreach ($images as $index => $image) {
            if (!$image) {
                continue;
            }
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
     * Handle single image from a direct-upload path
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
     * Handle a single legacy image file upload
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
     * Transform deal for API response, ensuring images/image_urls are present
     */
    private function transformDeal($deal)
    {
        if (!$deal) {
            return $deal;
        }

        $deal->loadMissing('dealImages');

        $images = $deal->dealImages->pluck('image_url')->toArray();
        $imageUrls = $deal->dealImages->map(function ($image) {
            return MediaUrl::url($image->image_url);
        })->toArray();

        $deal->setAttribute('images', $images);
        $deal->setAttribute('image_urls', $imageUrls);

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

    private function validationPayload(Request $request, array $normalized): array
    {
        return collect(array_merge($request->all(), $normalized))
            ->except(['publish_immediately', 'images'])
            ->all();
    }

    private function parsePublishImmediately(array $normalized): bool
    {
        if (! array_key_exists('publish_immediately', $normalized)) {
            return false;
        }

        return filter_var($normalized['publish_immediately'], FILTER_VALIDATE_BOOLEAN);
    }

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

        // FormData sends booleans as "true"/"false"; Laravel's boolean rule only accepts
        // true, false, 0, 1, "0", "1".
        if (array_key_exists('publish_immediately', $input)) {
            $value = $input['publish_immediately'];
            if (is_string($value)) {
                $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                $input['publish_immediately'] = $normalized === null ? $value : ($normalized ? '1' : '0');
            } elseif (is_bool($value)) {
                $input['publish_immediately'] = $value ? '1' : '0';
            }
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

    private function resolveListingKind(Request $request): string
    {
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
}