<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class FreeRegistrationInvite extends Model
{
    public const STATUS_GENERATED = 'generated';
    public const STATUS_CLICKED = 'clicked';
    public const STATUS_JOINED = 'joined';
    public const STATUS_EXPIRED = 'expired';

    public const EXPIRY_DAYS = 7;

    public const OPEN_EMAIL_PLACEHOLDER = '*';

    protected $fillable = [
        'token',
        'email',
        'is_open',
        'status',
        'expires_at',
        'clicked_at',
        'joined_at',
        'email_sent_at',
        'created_by',
        'user_id',
        'training_agreement_id',
    ];

    protected $casts = [
        'is_open' => 'boolean',
        'expires_at' => 'datetime',
        'clicked_at' => 'datetime',
        'joined_at' => 'datetime',
        'email_sent_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $invite) {
            if (!$invite->token) {
                $invite->token = (string) Str::uuid();
            }
            if ($invite->is_open) {
                $invite->email = $invite->email ?: self::OPEN_EMAIL_PLACEHOLDER;
                $invite->expires_at = null;
            } elseif (!$invite->expires_at) {
                $invite->expires_at = now()->addDays(self::EXPIRY_DAYS);
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOpen(): bool
    {
        return (bool) $this->is_open;
    }

    public function isExpired(): bool
    {
        if ($this->isOpen() || $this->expires_at === null) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    public function isUsable(): bool
    {
        if ($this->isOpen()) {
            return $this->status !== self::STATUS_EXPIRED;
        }

        return $this->status !== self::STATUS_JOINED
            && $this->status !== self::STATUS_EXPIRED
            && !$this->isExpired();
    }

    public function refreshStatus(): void
    {
        if ($this->isOpen()) {
            return;
        }

        if ($this->status === self::STATUS_JOINED) {
            return;
        }

        if ($this->isExpired()) {
            if ($this->status !== self::STATUS_EXPIRED) {
                $this->forceFill(['status' => self::STATUS_EXPIRED])->save();
            }
        }
    }

    public function inviteUrl(): string
    {
        $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        return $frontend . '/invite/' . $this->token;
    }

    public function toAdminArray(): array
    {
        $this->refreshStatus();

        return [
            'id' => $this->id,
            'token' => $this->token,
            'email' => $this->isOpen() ? null : $this->email,
            'is_open' => $this->isOpen(),
            'status' => $this->status,
            'invite_url' => $this->inviteUrl(),
            'expires_at' => $this->expires_at?->toISOString(),
            'clicked_at' => $this->clicked_at?->toISOString(),
            'joined_at' => $this->joined_at?->toISOString(),
            'email_sent_at' => $this->email_sent_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'created_by' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => trim($this->creator->first_name . ' ' . $this->creator->last_name),
                'email' => $this->creator->email,
            ] : null,
            'user_id' => $this->user_id,
            'training_agreement_id' => $this->training_agreement_id,
        ];
    }
}
