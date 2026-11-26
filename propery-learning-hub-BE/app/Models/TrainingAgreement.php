<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class TrainingAgreement extends Model
{
    public const STATUS_CLIENT_SIGNED = 'client_signed';
    public const STATUS_COMPLETED = 'completed';

    public const TYPE_TRAINING = 'training';
    public const TYPE_FREE_MEMBERSHIP = 'free_membership';

    public const VERSION = '2026-07';

    protected $fillable = [
        'public_token',
        'status',
        'agreement_type',
        'agreement_version',
        'client_full_name',
        'client_address',
        'client_dob',
        'client_email',
        'client_phone',
        'fee_amount_pence',
        'fee_currency',
        'payment_plan',
        'schedule_notes',
        'client_signature_data',
        'client_signed_at',
        'client_signed_ip',
        'client_user_agent',
        'user_id',
        'academy_payment_id',
        'admin_signature_data',
        'admin_signed_name',
        'admin_signed_position',
        'admin_signed_at',
        'admin_user_id',
        'admin_signed_ip',
        'pdf_path',
        'pdf_emailed_at',
        'completed_at',
    ];

    protected $casts = [
        'client_dob' => 'date',
        'client_signed_at' => 'datetime',
        'admin_signed_at' => 'datetime',
        'pdf_emailed_at' => 'datetime',
        'completed_at' => 'datetime',
        'fee_amount_pence' => 'integer',
    ];

    protected $hidden = [
        'client_signature_data',
        'admin_signature_data',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $agreement) {
            if (!$agreement->public_token) {
                $agreement->public_token = (string) Str::uuid();
            }
            if (!$agreement->agreement_version) {
                $agreement->agreement_version = self::VERSION;
            }
            if (!$agreement->agreement_type) {
                $agreement->agreement_type = self::TYPE_TRAINING;
            }
        });
    }

    public static function configForType(?string $type): array
    {
        return match ($type) {
            self::TYPE_FREE_MEMBERSHIP => config('free_membership_agreement'),
            default => config('training_agreement'),
        };
    }

    public function agreementConfig(): array
    {
        return self::configForType($this->agreement_type);
    }

    public function isFreeMembership(): bool
    {
        return $this->agreement_type === self::TYPE_FREE_MEMBERSHIP;
    }

    public function documentTitle(): string
    {
        return match ($this->agreement_type) {
            self::TYPE_FREE_MEMBERSHIP => 'Promotional Membership & Marketing Consideration Agreement',
            default => 'Training & Membership Services Agreement',
        };
    }

    public function pdfFilenamePrefix(): string
    {
        return match ($this->agreement_type) {
            self::TYPE_FREE_MEMBERSHIP => 'Freedom_Property_Academy_Free_Membership_Agreement',
            default => 'Freedom_Property_Academy_Training_Agreement',
        };
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    public function academyPayment(): BelongsTo
    {
        return $this->belongsTo(AcademyPayment::class);
    }

    public function isClientSigned(): bool
    {
        return $this->status === self::STATUS_CLIENT_SIGNED;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function formattedFee(): string
    {
        if ($this->isFreeMembership() || (int) $this->fee_amount_pence === 0 || $this->payment_plan === 'free') {
            return '£0.00';
        }

        $currency = strtoupper((string) ($this->fee_currency ?: 'GBP'));
        $symbol = $currency === 'GBP' ? '£' : $currency . ' ';

        return $symbol . number_format(((int) $this->fee_amount_pence) / 100, 2);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'public_token' => $this->public_token,
            'status' => $this->status,
            'agreement_type' => $this->agreement_type,
            'agreement_version' => $this->agreement_version,
            'client_full_name' => $this->client_full_name,
            'client_email' => $this->client_email,
            'client_phone' => $this->client_phone,
            'client_address' => $this->client_address,
            'client_dob' => $this->client_dob?->toDateString(),
            'fee_amount_pence' => $this->isFreeMembership() || $this->payment_plan === 'free'
                ? 0
                : $this->fee_amount_pence,
            'fee_currency' => $this->fee_currency ?: 'gbp',
            'formatted_fee' => $this->formattedFee(),
            'payment_plan' => $this->payment_plan,
            'schedule_notes' => $this->schedule_notes,
            'client_signed_at' => $this->client_signed_at?->toISOString(),
            'admin_signed_name' => $this->admin_signed_name,
            'admin_signed_position' => $this->admin_signed_position,
            'admin_signed_at' => $this->admin_signed_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'has_pdf' => !empty($this->pdf_path),
            'pdf_emailed_at' => $this->pdf_emailed_at?->toISOString(),
            'user_id' => $this->user_id,
            'academy_payment_id' => $this->academy_payment_id,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    public function toAdminArray(): array
    {
        return array_merge($this->toPublicArray(), [
            'client_signature_data' => $this->client_signature_data,
            'admin_signature_data' => $this->admin_signature_data,
            'client_signed_ip' => $this->client_signed_ip,
            'admin_signed_ip' => $this->admin_signed_ip,
            'pdf_path' => $this->pdf_path,
            'pdf_emailed_at' => $this->pdf_emailed_at?->toISOString(),
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => trim($this->user->first_name . ' ' . $this->user->last_name),
                'email' => $this->user->email,
                'email_verified' => $this->user->email_verified_at !== null,
                'email_verified_at' => $this->user->email_verified_at?->toISOString(),
            ] : null,
            'admin_user' => $this->adminUser ? [
                'id' => $this->adminUser->id,
                'name' => trim($this->adminUser->first_name . ' ' . $this->adminUser->last_name),
                'email' => $this->adminUser->email,
            ] : null,
        ]);
    }
}
