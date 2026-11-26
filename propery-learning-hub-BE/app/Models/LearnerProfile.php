<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LearnerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'profile_photo_path',
        'proof_of_address_path',
        'proof_of_address_original_name',
        'proof_of_address_mime',
        'proof_of_address_size',
        'proof_of_address_uploaded_at',
        'date_of_birth',
        'gender',
        'bio',
        'job_title',
        'company',
        'years_of_experience',
        'investment_budget',
        'investment_interests',
        'learning_preferences',
        'settings',
        'country',
        'city',
        'alternate_phone',
        'linkedin_url',
        'subscription_plan',
        'billing_cycle',
        'payment_pending',
        'profile_completed',
        'profile_completed_at',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'investment_interests' => 'array',
        'learning_preferences' => 'array',
        'settings' => 'array',
        'profile_completed' => 'boolean',
        'payment_pending' => 'boolean',
        'proof_of_address_uploaded_at' => 'datetime',
        'proof_of_address_size' => 'integer',
    ];

    protected $appends = ['profile_photo_url', 'proof_of_address'];

    protected $hidden = [
        'proof_of_address_path',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getProfilePhotoUrlAttribute()
    {
        if (!$this->profile_photo_path) {
            return null;
        }

        return MediaUrl::url($this->profile_photo_path);
    }

    /**
     * Safe metadata for API consumers (never exposes the raw storage path).
     *
     * @return array{uploaded: bool, original_name: string|null, mime: string|null, size: int|null, uploaded_at: string|null}
     */
    public function getProofOfAddressAttribute(): array
    {
        return [
            'uploaded' => !empty($this->proof_of_address_path),
            'original_name' => $this->proof_of_address_original_name,
            'mime' => $this->proof_of_address_mime,
            'size' => $this->proof_of_address_size,
            'uploaded_at' => $this->proof_of_address_uploaded_at?->toISOString(),
        ];
    }

    public function hasProofOfAddress(): bool
    {
        return !empty($this->proof_of_address_path);
    }

    /**
     * @return array{email_notifications: bool, theme: string, language: string}
     */
    public function resolvedSettings(): array
    {
        return array_merge([
            'email_notifications' => true,
            'theme' => 'light',
            'language' => 'English',
        ], $this->settings ?? []);
    }
}
