<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Deal extends Model
{
    use HasFactory;

    // Marketplace workflow statuses (stored uppercase)
    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_VERIFIED = 'VERIFIED';
    public const STATUS_REJECTED = 'REJECTED';
    public const STATUS_RESUBMITTED = 'RESUBMITTED';
    public const STATUS_CLOSED = 'CLOSED';

    /** @deprecated Use STATUS_VERIFIED — kept for older instructor code paths */
    public const STATUS_PUBLISHED = 'VERIFIED';

    // listing_kind: origin section. Review stays "review" even after send-to-marketplace.
    // Public visibility is controlled by status=VERIFIED + published_at (see isPubliclyVisible).
    public const LISTING_KIND_MARKETPLACE = 'marketplace';
    public const LISTING_KIND_REVIEW = 'review';

    // Legacy approval status constants (older dual-status flow)
    public const APPROVAL_STATUS_PENDING = 'pending';
    public const APPROVAL_STATUS_APPROVED = 'approved';
    public const APPROVAL_STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'title',
        'location',
        'price',
        'roi',
        'status',
        'listing_kind',
        'approval_status',
        'rejection_reason',
        'rejection_note',
        'featured',
        'views',
        'inquiries',
        'description',
        'property_type',
        'occupancy',
        'image_url', // Keep for backward compatibility
        'created_by',
        'published_at',
        'closed_at',
        'approved_at',
        'approved_by',
        'verified_at',
        'verified_by',
        'submitted_by_role',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'roi' => 'decimal:2',
        'occupancy' => 'decimal:2',
        'featured' => 'boolean',
        'views' => 'integer',
        'inquiries' => 'integer',
        'published_at' => 'datetime',
        'closed_at' => 'datetime',
        'approved_at' => 'datetime',
        'approved_by' => 'integer',
        'verified_at' => 'datetime',
        'verified_by' => 'integer',
    ];

    protected $appends = ['formatted_price', 'image_url_full', 'images'];

    protected $attributes = [
        'listing_kind' => self::LISTING_KIND_MARKETPLACE,
    ];

    protected function formattedPrice(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->price === null
                ? null
                : '£' . number_format($this->price ?? 0, 0, '.', ',')
        );
    }

    protected function imageUrlFull(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->image_url ? MediaUrl::url($this->image_url) : null
        );
    }

    /**
     * Get all images for this deal
     */
    public function dealImages()
    {
        return $this->hasMany(DealImage::class)->orderBy('order');
    }

    /**
     * Get primary image
     */
    public function primaryImage()
    {
        return $this->hasOne(DealImage::class)->where('is_primary', true);
    }

    /**
     * Get all image URLs as array
     */
    protected function getImagesAttribute(): array
    {
        return $this->dealImages->pluck('image_url')->toArray();
    }

    /**
     * Get all image URLs with full URLs
     */
    protected function getImageUrlsAttribute(): array
    {
        return $this->dealImages->map(function ($image) {
            return MediaUrl::url($image->image_url);
        })->toArray();
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function histories()
    {
        return $this->hasMany(DealStatusHistory::class, 'deal_id');
    }

    /**
     * Transition deal status and record history.
     */
    public function transitionTo(string $newStatus, ?string $note = null, ?int $changedBy = null): void
    {
        $oldStatus = $this->status;

        $payload = ['status' => $newStatus];

        if ($newStatus === self::STATUS_VERIFIED) {
            $payload['verified_at'] = now();
            $payload['verified_by'] = $changedBy;
            $payload['rejection_note'] = null;
            // Review deals stay private until the learner sends them to marketplace
            if ($this->listing_kind !== self::LISTING_KIND_REVIEW) {
                $payload['published_at'] = $this->published_at ?? now();
            }
        }

        if ($newStatus === self::STATUS_REJECTED) {
            $payload['rejection_note'] = $note;
            $payload['verified_at'] = null;
            $payload['verified_by'] = null;
        }

        if ($newStatus === self::STATUS_CLOSED) {
            $payload['closed_at'] = now();
        }

        $this->update($payload);

        $this->histories()->create([
            'old_status' => $oldStatus ?? 'NONE',
            'new_status' => $newStatus,
            'note' => $note,
            'changed_by' => $changedBy,
        ]);
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_VERIFIED)
            ->whereNotNull('published_at');
    }

    public function scopeMarketplace($query)
    {
        return $query->where('listing_kind', self::LISTING_KIND_MARKETPLACE);
    }

    public function scopeReview($query)
    {
        return $query->where('listing_kind', self::LISTING_KIND_REVIEW);
    }

    public function scopeFeatured($query)
    {
        return $query->where('featured', true);
    }

    public function isReviewListing(): bool
    {
        return $this->listing_kind === self::LISTING_KIND_REVIEW;
    }

    public function isListedOnMarketplace(): bool
    {
        return $this->status === self::STATUS_VERIFIED && $this->published_at !== null;
    }

    public function isPubliclyVisible(): bool
    {
        return $this->isListedOnMarketplace();
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'like', "%{$search}%")
              ->orWhere('location', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%");
        });
    }

    public function scopeFilterByStatus($query, $status)
    {
        if ($status && $status !== 'all') {
            return $query->where('status', $status);
        }
        return $query;
    }

    public function scopeFilterByApprovalStatus($query, $status)
    {
        if ($status && $status !== 'all') {
            return $query->where('approval_status', $status);
        }
        return $query;
    }

    public function markAsPublished()
    {
        $this->transitionTo(self::STATUS_VERIFIED, 'Deal published', null);
    }

    public function markAsClosed()
    {
        $this->transitionTo(self::STATUS_CLOSED, 'Deal closed', null);
    }

    public function markAsApproved($adminId)
    {
        $this->update([
            'approval_status' => self::APPROVAL_STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by' => $adminId,
            'rejection_reason' => null,
        ]);
    }

    public function markAsRejected($adminId, $reason = null)
    {
        $this->update([
            'approval_status' => self::APPROVAL_STATUS_REJECTED,
            'rejection_reason' => $reason,
            'approved_at' => now(),
            'approved_by' => $adminId,
        ]);
    }

    public function incrementViews()
    {
        $this->increment('views');
    }

    public function incrementInquiries()
    {
        $this->increment('inquiries');
    }

    public function isApproved(): bool
    {
        return $this->approval_status === self::APPROVAL_STATUS_APPROVED
            || $this->status === self::STATUS_VERIFIED;
    }

    public function isPending(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_RESUBMITTED], true)
            || $this->approval_status === self::APPROVAL_STATUS_PENDING;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED
            || $this->approval_status === self::APPROVAL_STATUS_REJECTED;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_VERIFIED;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }
}