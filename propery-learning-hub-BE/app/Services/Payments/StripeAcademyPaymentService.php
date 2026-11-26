<?php

namespace App\Services\Payments;

use App\Mail\PaymentSuccessMail;
use App\Models\AcademyPayment;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\Webhook;

class StripeAcademyPaymentService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    public function getPublicConfig(): array
    {
        $amount = (int) config('services.stripe.academy_amount');
        $currency = config('services.stripe.academy_currency', 'gbp');

        return [
            'publishable_key' => config('services.stripe.key'),
            'product_name' => config('services.stripe.academy_product_name'),
            'amount' => $amount,
            'currency' => $currency,
            'formatted_amount' => $this->formatMoney($amount, $currency),
        ];
    }

    public function createPaymentIntent(?string $email = null, ?string $agreementToken = null, ?int $userId = null): array
    {
        if ($userId) {
            $reused = $this->reuseOpenPaymentIntentForUser($userId, $email, $agreementToken);
            if ($reused !== null) {
                return $reused;
            }
        }

        $amount = (int) config('services.stripe.academy_amount');
        $currency = config('services.stripe.academy_currency', 'gbp');

        $intentData = [
            'amount' => $amount,
            'currency' => $currency,
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => [
                'product' => 'academy_enrollment',
            ],
        ];

        if ($email) {
            $intentData['receipt_email'] = $email;
            $intentData['metadata']['customer_email'] = $email;
        }

        if ($agreementToken) {
            $intentData['metadata']['agreement_token'] = $agreementToken;
        }

        if ($userId) {
            $intentData['metadata']['user_id'] = (string) $userId;
            $intentData['metadata']['flow'] = 'mobile_post_registration';
        }

        $intent = PaymentIntent::create($intentData);

        $payment = AcademyPayment::create([
            'stripe_payment_intent_id' => $intent->id,
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'pending',
            'customer_email' => $email,
            'user_id' => $userId,
            'metadata' => array_filter([
                'product' => 'academy_enrollment',
                'agreement_token' => $agreementToken,
                'user_id' => $userId,
                'flow' => $userId ? 'mobile_post_registration' : null,
            ]),
        ]);

        return $this->intentPayload($intent, $payment);
    }

    /**
     * Reuse a still-open PaymentIntent for the same learner to avoid orphan Stripe intents.
     *
     * @return array<string, mixed>|null
     */
    private function reuseOpenPaymentIntentForUser(int $userId, ?string $email, ?string $agreementToken): ?array
    {
        $existing = AcademyPayment::query()
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->whereNotNull('stripe_payment_intent_id')
            ->orderByDesc('id')
            ->first();

        if (!$existing) {
            return null;
        }

        try {
            $intent = PaymentIntent::retrieve($existing->stripe_payment_intent_id);
        } catch (\Throwable $e) {
            Log::warning('Could not retrieve pending academy PaymentIntent; creating a new one', [
                'payment_id' => $existing->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if ($intent->status === 'succeeded') {
            $this->syncPaymentIntent($intent->id);

            return null;
        }

        $reusable = [
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
            'processing',
        ];

        if (!in_array($intent->status, $reusable, true)) {
            $existing->update(['status' => 'failed']);

            return null;
        }

        if ($email && !$existing->customer_email) {
            $existing->update(['customer_email' => $email]);
        }

        if ($agreementToken) {
            $meta = $existing->metadata ?? [];
            $meta['agreement_token'] = $agreementToken;
            $existing->update(['metadata' => $meta]);
        }

        return $this->intentPayload($intent, $existing->fresh());
    }

    /** @return array<string, mixed> */
    private function intentPayload(PaymentIntent $intent, AcademyPayment $payment): array
    {
        $amount = (int) $payment->amount;
        $currency = (string) $payment->currency;

        return [
            'client_secret' => $intent->client_secret,
            'payment_intent_id' => $intent->id,
            'payment_id' => $payment->id,
            'amount' => $amount,
            'currency' => $currency,
            'formatted_amount' => $this->formatMoney($amount, $currency),
            'publishable_key' => config('services.stripe.key'),
        ];
    }

    public function syncPaymentIntent(string $paymentIntentId): AcademyPayment
    {
        $intent = PaymentIntent::retrieve($paymentIntentId);

        $payment = AcademyPayment::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->firstOrFail();

        if ($intent->status === 'succeeded') {
            $email = $payment->customer_email
                ?? $intent->receipt_email
                ?? ($intent->metadata['customer_email'] ?? null);

            $userId = $payment->user_id
                ?? (isset($intent->metadata['user_id']) ? (int) $intent->metadata['user_id'] : null);

            $payment->fill([
                'status' => $userId ? 'consumed' : 'paid',
                'customer_email' => $email,
                'user_id' => $userId,
                'paid_at' => $payment->paid_at ?? now(),
            ]);
            $payment->save();

            if ($userId) {
                $this->clearPaymentPendingForUser($userId, $payment);
            }
        } elseif (in_array($intent->status, ['canceled'], true)) {
            $payment->update(['status' => 'failed']);
        }

        return $payment->fresh();
    }

    public function findPaymentByReference(string $reference): AcademyPayment
    {
        if (str_starts_with($reference, 'pi_')) {
            return $this->syncPaymentIntent($reference);
        }

        throw new \InvalidArgumentException('Unknown payment reference.');
    }

    /**
     * Mark learner as paid after successful Stripe payment (mobile post-registration flow).
     */
    public function clearPaymentPendingForUser(int $userId, ?AcademyPayment $payment = null): void
    {
        $user = User::query()->with('learnerProfile')->find($userId);
        if (!$user || !$user->isLearner() || !$user->learnerProfile) {
            return;
        }

        $profile = $user->learnerProfile;
        if (!$profile->payment_pending && $profile->subscription_plan === 'pro') {
            return;
        }

        $profile->forceFill([
            'payment_pending' => false,
            'subscription_plan' => 'pro',
            'billing_cycle' => 'yearly',
        ])->save();

        if ($payment && !$payment->user_id) {
            $payment->update([
                'user_id' => $userId,
                'status' => 'consumed',
            ]);
        }
    }

    /**
     * Confirm a succeeded PaymentIntent for an already-registered learner.
     */
    public function confirmPostRegistrationPayment(User $user, string $paymentIntentId): AcademyPayment
    {
        $payment = $this->syncPaymentIntent($paymentIntentId);

        if (!$payment->isPaid()) {
            throw new \InvalidArgumentException('Payment has not completed yet. Status: ' . $payment->status);
        }

        $email = strtolower((string) ($payment->customer_email ?? ''));
        if ($email !== '' && strcasecmp($email, $user->email) !== 0) {
            throw new \InvalidArgumentException('Payment email does not match your account.');
        }

        if ($payment->user_id && (int) $payment->user_id !== (int) $user->id) {
            throw new \InvalidArgumentException('This payment belongs to another account.');
        }

        $payment->update([
            'user_id' => $user->id,
            'status' => 'consumed',
            'customer_email' => $payment->customer_email ?: $user->email,
            'paid_at' => $payment->paid_at ?? now(),
        ]);

        $this->clearPaymentPendingForUser((int) $user->id, $payment->fresh());

        return $payment->fresh();
    }

    public function handleWebhook(string $payload, ?string $signature): void
    {
        $secret = config('services.stripe.webhook_secret');

        if (!$secret) {
            return;
        }

        $event = Webhook::constructEvent($payload, $signature ?? '', $secret);

        if ($event->type === 'payment_intent.succeeded') {
            $intent = $event->data->object;
            $this->syncPaymentIntent($intent->id);
        }
    }

    public function sendPaymentSuccessEmail(AcademyPayment $payment): void
    {
        if ($payment->payment_email_sent_at || !$payment->customer_email) {
            return;
        }

        try {
            Mail::to($payment->customer_email)->send(new PaymentSuccessMail($payment));
            $payment->update(['payment_email_sent_at' => now()]);
        } catch (\Throwable $e) {
            Log::error('Failed to send payment success email', [
                'payment_id' => $payment->id,
                'email' => $payment->customer_email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendEnrollmentConfirmationEmail(
        AcademyPayment $payment,
        User $user,
        ?string $setPasswordUrl = null,
    ): void {
        if ($payment->payment_email_sent_at) {
            return;
        }

        try {
            Mail::to($user->email)->send(new PaymentSuccessMail($payment, $user, $setPasswordUrl));
            $payment->update(['payment_email_sent_at' => now()]);
        } catch (\Throwable $e) {
            Log::error('Failed to send enrollment confirmation email', [
                'payment_id' => $payment->id,
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function formatMoney(int $amountMinor, string $currency): string
    {
        $symbol = strtoupper($currency) === 'GBP' ? '£' : strtoupper($currency) . ' ';

        return $symbol . number_format($amountMinor / 100, 2);
    }
}
