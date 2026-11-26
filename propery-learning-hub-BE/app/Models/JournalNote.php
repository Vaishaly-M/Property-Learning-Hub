<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'type',
        'goal',
        'checklist',
        'checked_items',
        'shared_with',
    ];

    protected $casts = [
        'checklist' => 'array',
        'checked_items' => 'array',
        'shared_with' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(JournalShare::class, 'note_id');
    }

    public function getAuthorNameAttribute(): string
    {
        return $this->user->name ?? 'Unknown User';
    }

    public function getAuthorAttribute(): string
    {
        return $this->user->role ?? 'learner';
    }
}