<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaidUserInvite extends Model
{
    public const STATUS_GENERATED = 'generated';
    public const STATUS_OPEN = 'open';
    public const STATUS_SIGNED = 'signed';
    public const STATUS_JOINED = 'joined';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'token',
        'email',
        'status',
        'expires_at',
        'opened_at',
        'signed_at',
        'joined_at',
        'email_sent_at',
        'created_by',
        'user_id',
        'training_agreement_id',
        'academy_payment_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'opened_at' => 'datetime',
        'signed_at' => 'datetime',
        'joined_at' => 'datetime',
        'email_sent_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $invite) {
            if (!$invite->token) {
                $invite->token = (string) Str::uuid();
            }
            if (!$invite->expires_at) {
                $invite->expires_at = now()->addDays(3);
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

    public function trainingAgreement(): BelongsTo
    {
        return $this->belongsTo(TrainingAgreement::class);
    }

    public function academyPayment(): BelongsTo
    {
        return $this->belongsTo(AcademyPayment::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsable(): bool
    {
        return $this->status !== self::STATUS_JOINED
            && $this->status !== self::STATUS_EXPIRED
            && !$this->isExpired();
    }

    public function refreshStatus(): void
    {
        if ($this->status === self::STATUS_JOINED) {
            return;
        }

        if ($this->isExpired() && $this->status !== self::STATUS_EXPIRED) {
            $this->forceFill(['status' => self::STATUS_EXPIRED])->save();
        }
    }

    public function inviteUrl(): string
    {
        $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        return $frontend . '/join/' . $this->token;
    }

    public function toAdminArray(): array
    {
        $this->refreshStatus();

        return [
            'id' => $this->id,
            'token' => $this->token,
            'email' => $this->email,
            'status' => $this->status,
            'invite_url' => $this->inviteUrl(),
            'expires_at' => $this->expires_at?->toISOString(),
            'opened_at' => $this->opened_at?->toISOString(),
            'signed_at' => $this->signed_at?->toISOString(),
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
            'academy_payment_id' => $this->academy_payment_id,
        ];
    }
}
