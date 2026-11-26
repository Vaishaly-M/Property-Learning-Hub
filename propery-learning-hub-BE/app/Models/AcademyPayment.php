<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademyPayment extends Model
{
    protected $fillable = [
        'stripe_checkout_session_id',
        'stripe_payment_intent_id',
        'amount',
        'currency',
        'status',
        'customer_email',
        'user_id',
        'paid_at',
        'payment_email_sent_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'paid_at' => 'datetime',
            'payment_email_sent_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeAcademyEnrollment(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where('metadata->product', 'academy_enrollment')
                ->orWhere(function (Builder $sub) {
                    $sub->whereNull('metadata')
                        ->orWhereNull('metadata->product');
                });
        });
    }

    public function isAcademyEnrollment(): bool
    {
        $product = $this->metadata['product'] ?? null;

        return $product === null || $product === 'academy_enrollment';
    }

    public function isPaid(): bool
    {
        return in_array($this->status, ['paid', 'consumed'], true);
    }

    public function isAvailableForRegistration(): bool
    {
        return $this->status === 'paid' && $this->user_id === null;
    }
}
