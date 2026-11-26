<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmEvent extends Model
{
    protected $fillable = [
        'title',
        'description',
        'venue',
        'online_link',
        'capacity',
        'starts_at',
        'ends_at',
        'status',
        'presenter_id',
        'created_by',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    public function presenter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'presenter_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(CrmEventRegistration::class);
    }

    public function getRegistrationCountAttribute(): int
    {
        return $this->registrations()->count();
    }

    public function getAttendanceCountAttribute(): int
    {
        return $this->registrations()->where('attended', true)->count();
    }
}
