<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'template_id',
        'template_name',
        'tags',
        'shared_with',
        'category',
        'status',
        'form_data',
        'custom_questions',
    ];

    protected $casts = [
        'tags' => 'array',
        'shared_with' => 'array',
        'form_data' => 'array',
        'custom_questions' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(JournalShare::class, 'document_id');
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