<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Communication extends Model
{
    protected $fillable = [
        'type',
        'subject',
        'body',
        'priority',
        'category',
        'audience_filter',
        'filter_params',
        'status',
        'scheduled_at',
        'sent_at',
        'recipient_count',
        'created_by',
    ];

    protected $casts = [
        'filter_params' => 'array',
        'scheduled_at'  => 'datetime',
        'sent_at'       => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(CommunicationRecipient::class);
    }
}
