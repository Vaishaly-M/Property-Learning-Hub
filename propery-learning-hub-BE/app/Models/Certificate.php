<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'title',
        'issuer',
        'description',
        'verification_code',
        'certificate_path',
        'issued_at',
        'expires_at',
        'metadata',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    // Generate unique verification code
    public static function generateVerificationCode(): string
    {
        do {
            $code = 'CERT-' . strtoupper(substr(md5(uniqid() . time()), 0, 12));
        } while (self::where('verification_code', $code)->exists());
        
        return $code;
    }

    // Get certificate download URL
    public function getDownloadUrlAttribute(): ?string
    {
        if (!$this->certificate_path) {
            return null;
        }
        return route('api.certificates.download', ['code' => $this->verification_code]);
    }
}