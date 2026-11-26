<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessJournal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'mission',
        'visions',
        'roadmap',
    ];

    protected $casts = [
        'visions' => 'array',
        'roadmap' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}