<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactActivity extends Model
{
    protected $fillable = [
        'contact_id',
        'activity_type',
        'title',
        'description',
        'metadata',
        'performed_by',
        'happened_at',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'happened_at' => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function getTypeAttribute(): string
    {
        return $this->activity_type;
    }

    public function setTypeAttribute(string $value): void
    {
        $this->attributes['activity_type'] = $value;
    }
}
