<?php

namespace App\Services\Payments;

use App\Models\AcademyPayment;
use App\Models\User;
use App\Models\Webinar;
use App\Models\WebinarRegistration;
use Stripe\Exception\ApiErrorException;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\Stripe;

class StripeWebinarPaymentService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    public function createPaymentIntent(Webinar $webinar, User $user): array
    {
        $amount = $this->amountForWebinar($webinar);
        $currency = config('services.stripe.academy_currency', 'gbp');

        if ($amount <= 0) {
            throw new \InvalidArgumentException('This webinar does not require payment.');
        }

        $intent = PaymentIntent::create([
            'amount' => $amount,
            'currency' => $currency,
            'automatic_payment_methods' => ['enabled' => true],
            'receipt_email' => $user->email,
            'metadata' => [
                'product' => 'webinar_registration',
                'webinar_id' => (string) $webinar->id,
                'learner_id' => (string) $user->id,
            ],
        ]);

        AcademyPayment::updateOrCreate(
            ['stripe_payment_intent_id' => $intent->id],
            [
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'pending',
                'customer_email' => $user->email,
                'user_id' => $user->id,
                'metadata' => [
                    'product' => 'webinar_registration',
                    'webinar_id' => $webinar->id,
                    'learner_id' => $user->id,
                ],
            ]
        );

        return [
            'client_secret' => $intent->client_secret,
            'payment_intent_id' => $intent->id,
            'amount' => $amount,
            'currency' => $currency,
            'formatted_amount' => $this->formatMoney($amount, $currency),
            'publishable_key' => config('services.stripe.key'),
        ];
    }

    public function verifyWebinarPayment(string $paymentIntentId, Webinar $webinar, int $learnerId): AcademyPayment
    {
        $payment = AcademyPayment::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->firstOrFail();

        $intent = PaymentIntent::retrieve($paymentIntentId);

        if ($intent->status !== 'succeeded') {
            throw new \RuntimeException('Payment has not been completed yet.');
        }

        $metadata = $payment->metadata ?? [];
        if ((int) ($metadata['webinar_id'] ?? 0) !== (int) $webinar->id) {
            throw new \RuntimeException('This payment does not match the selected webinar.');
        }

        if ((int) ($metadata['learner_id'] ?? 0) !== $learnerId) {
            throw new \RuntimeException('This payment does not belong to your account.');
        }

        $expectedAmount = $this->amountForWebinar($webinar);
        if ((int) $intent->amount !== $expectedAmount) {
            throw new \RuntimeException('Payment amount does not match the webinar price.');
        }

        $alreadyUsed = WebinarRegistration::query()
            ->where('payment_reference', $paymentIntentId)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->exists();

        if ($alreadyUsed) {
            throw new \RuntimeException('This payment has already been used for a registration.');
        }

        $payment->update([
            'status' => 'consumed',
            'paid_at' => $payment->paid_at ?? now(),
            'user_id' => $learnerId,
        ]);

        return $payment->fresh();
    }

    /**
     * Refund a paid webinar registration via Stripe.
     *
     * @return array{refunded: bool, refund_amount?: string, formatted_amount?: string, currency?: string}
     */
    public function refundRegistration(WebinarRegistration $registration): array
    {
        if ($registration->payment_status === 'refunded') {
            $amount = number_format((float) ($registration->amount_paid ?? 0), 2, '.', '');
            $currency = config('services.stripe.academy_currency', 'gbp');

            return [
                'refunded'          => true,
                'refund_amount'     => $amount,
                'formatted_amount'  => $this->formatMoney((int) round(((float) $amount) * 100), $currency),
                'currency'          => $currency,
                'already_refunded'  => true,
            ];
        }

        if ($registration->payment_status !== 'paid' || empty($registration->payment_reference)) {
            return ['refunded' => false];
        }

        if (!config('services.stripe.secret')) {
            throw new \RuntimeException('Automatic refunds are unavailable. Please contact support to request a refund.');
        }

        $paymentIntentId = $registration->payment_reference;
        $payment = AcademyPayment::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();

        try {
            $intent = PaymentIntent::retrieve($paymentIntentId);

            if ($intent->status !== 'succeeded') {
                throw new \RuntimeException('This payment is not eligible for a refund.');
            }

            $existingRefunds = Refund::all([
                'payment_intent' => $paymentIntentId,
                'limit'          => 1,
            ]);

            if (count($existingRefunds->data) === 0) {
                Refund::create(['payment_intent' => $paymentIntentId]);
            }
        } catch (ApiErrorException $e) {
            throw new \RuntimeException('Unable to process refund: ' . $e->getMessage());
        }

        if ($payment) {
            $payment->update(['status' => 'refunded']);
        }

        $amountMinor = $payment?->amount ?? (int) round(((float) ($registration->amount_paid ?? 0)) * 100);
        $currency = $payment?->currency ?? config('services.stripe.academy_currency', 'gbp');

        return [
            'refunded'         => true,
            'refund_amount'    => number_format($amountMinor / 100, 2, '.', ''),
            'formatted_amount' => $this->formatMoney($amountMinor, $currency),
            'currency'         => $currency,
        ];
    }

    private function amountForWebinar(Webinar $webinar): int
    {
        return (int) round(((float) $webinar->price) * 100);
    }

    private function formatMoney(int $amountMinor, string $currency): string
    {
        $symbol = strtoupper($currency) === 'GBP' ? '£' : strtoupper($currency) . ' ';

        return $symbol . number_format($amountMinor / 100, 2);
    }
}
