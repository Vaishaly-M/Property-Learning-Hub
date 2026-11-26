<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContractTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'category',
        'description',
        'price',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
        'is_active',
        'is_global',
        'docusign_template_id',
    ];

    protected $casts = [
        'price'             => 'float',
        'is_active'         => 'boolean',
        'is_global'         => 'boolean',
        'docusign_template_id' => 'array',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function purchases()
    {
        return $this->hasMany(ContractPurchase::class);
    }

    // ── Accessors ──────────────────────────────────────────────────

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path
            ? MediaUrl::url($this->file_path)
            : null;
    }

    public function getFormattedSizeAttribute(): ?string
    {
        if (!$this->file_size) return null;
        $bytes = $this->file_size;
        if ($bytes < 1024)       return "{$bytes} B";
        if ($bytes < 1048576)    return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }

    // ── Helpers ────────────────────────────────────────────────────

    public function isPurchasedBy(int $userId): bool
    {
        if ($this->price == 0) return true;
        if ($this->user_id === $userId) return true; // owner always has access

        return $this->purchases()
            ->where('user_id', $userId)
            ->where('status', 'completed')
            ->exists();
    }

    public function isOwnedBy(int $userId): bool
    {
        return $this->user_id === $userId;
    }
}