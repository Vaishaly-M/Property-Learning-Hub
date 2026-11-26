<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Contact extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'contact_ref',
        'first_name',
        'last_name',
        'email',
        'phone_number',
        'notes',
        'status',
        'user_id',
        'created_by',
    ];

    protected $appends = ['full_name'];

    protected static function booted(): void
    {
        static::created(function (Contact $contact) {
            if (! str_starts_with((string) $contact->contact_ref, 'TMP-')) {
                return;
            }

            $finalRef = self::formatContactRef($contact->id);
            $contact->updateQuietly(['contact_ref' => $finalRef]);
            $contact->contact_ref = $finalRef;
        });
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function classifications(): HasMany
    {
        return $this->hasMany(ContactClassification::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function contactCourses(): HasMany
    {
        return $this->hasMany(ContactCourse::class);
    }

    public function webinarRegistrations(): HasMany
    {
        return $this->hasMany(ContactWebinarRegistration::class);
    }

    public function eventRegistrations(): HasMany
    {
        return $this->hasMany(CrmEventRegistration::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ContactActivity::class)->orderByDesc('created_at');
    }

    public function communicationRecipients(): HasMany
    {
        return $this->hasMany(CommunicationRecipient::class);
    }

    public static function generateContactRef(): string
    {
        return 'TMP-' . strtoupper(Str::random(16));
    }

    public static function formatContactRef(int $id): string
    {
        return 'FPA-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    public function syncClassifications(array $classifications): void
    {
        $this->classifications()->delete();
        foreach (array_unique($classifications) as $classification) {
            $this->classifications()->create(['classification' => $classification]);
        }
    }

    public function getClassificationListAttribute(): array
    {
        return $this->classifications->pluck('classification')->toArray();
    }
}
