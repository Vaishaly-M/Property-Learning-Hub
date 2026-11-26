<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'note_id',
        'document_id',
        'shared_by',
        'shared_with',
        'permission',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(JournalNote::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(JournalDocument::class);
    }

    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by');
    }

    public function sharedWithUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_with');
    }
}