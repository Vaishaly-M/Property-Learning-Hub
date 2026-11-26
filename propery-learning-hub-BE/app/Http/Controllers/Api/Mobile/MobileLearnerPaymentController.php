<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\TrainingAgreement;
use App\Models\User;
use App\Services\Agreements\TrainingAgreementService;
use App\Services\Payments\StripeAcademyPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Stripe\Exception\ApiErrorException;

/**
 * Mobile post-registration payment.
 * Call after login/verify when user.payment_pending === true.
 */
class MobileLearnerPaymentController extends Controller
{
    public function __construct(
        private readonly StripeAcademyPaymentService $payments,
        private readonly TrainingAgreementService $agreements,
    ) {}

    public function config(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('learnerProfile');

        return response()->json([
            'success' => true,
            'data' => array_merge($this->payments->getPublicConfig(), [
                'payment_pending' => $user->isPaymentPending(),
                'full_access' => !$user->isPaymentPending() && $user->hasVerifiedEmail(),
            ]),
        ]);
    }

    public function createIntent(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('learnerProfile');

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only learners can pay via this endpoint.',
            ], 403);
        }

        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email before paying.',
                'email_verification_required' => true,
            ], 403);
        }

        if (!$user->isPaymentPending()) {
            return response()->json([
                'success' => true,
                'message' => 'Payment is already complete.',
                'payment_pending' => false,
                'full_access' => true,
            ]);
        }

        $agreement = null;
        $agreementToken = $request->input('agreement_token');

        if ($agreementToken) {
            $agreement = TrainingAgreement::query()
                ->where('public_token', (string) $agreementToken)
                ->where('agreement_type', TrainingAgreement::TYPE_TRAINING)
                ->first();

            if (!$agreement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Agreement not found.',
                ], 422);
            }

            if ($agreement->user_id && (int) $agreement->user_id !== (int) $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Agreement does not belong to this account.',
                ], 422);
            }
        } else {
            $agreement = TrainingAgreement::query()
                ->where('user_id', $user->id)
                ->where('agreement_type', TrainingAgreement::TYPE_TRAINING)
                ->orderByDesc('id')
                ->first();
            $agreementToken = $agreement?->public_token;
        }

        try {
            $result = $this->payments->createPaymentIntent(
                $user->email,
                $agreementToken ? (string) $agreementToken : null,
                (int) $user->id,
            );

            if (!empty($result['payment_id']) && $agreement) {
                $this->agreements->linkToPayment($agreement, (int) $result['payment_id']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment intent created. Confirm with Stripe Payment Sheet, then call /confirm.',
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (ApiErrorException $e) {
            Log::error('Mobile payment intent failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to start payment. Please try again.',
            ], 502);
        }
    }

    public function confirm(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('learnerProfile');

        $validator = Validator::make($request->all(), [
            'payment_intent_id' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only learners can confirm payment via this endpoint.',
            ], 403);
        }

        if (!$user->isPaymentPending()) {
            return response()->json([
                'success' => true,
                'message' => 'Payment is already complete. Full access enabled.',
                'payment_pending' => false,
                'full_access' => true,
                'data' => [
                    'payment_intent_id' => $request->string('payment_intent_id')->toString(),
                    'status' => 'consumed',
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'payment_pending' => false,
                        'subscription_plan' => $user->learnerProfile?->subscription_plan,
                        'billing_cycle' => $user->learnerProfile?->billing_cycle,
                    ],
                ],
            ]);
        }

        try {
            $payment = $this->payments->confirmPostRegistrationPayment(
                $user,
                $request->string('payment_intent_id')->toString(),
            );

            $user->refresh()->load('learnerProfile');

            try {
                $this->payments->sendEnrollmentConfirmationEmail($payment, $user);
            } catch (\Throwable $e) {
                Log::warning('Mobile payment confirm: enrollment email failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment confirmed. Full access enabled.',
                'payment_pending' => false,
                'full_access' => true,
                'data' => [
                    'payment_intent_id' => $payment->stripe_payment_intent_id,
                    'status' => $payment->status,
                    'paid_at' => $payment->paid_at?->toISOString(),
                    'formatted_amount' => $this->payments->getPublicConfig()['formatted_amount'],
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'payment_pending' => false,
                        'subscription_plan' => $user->learnerProfile?->subscription_plan,
                        'billing_cycle' => $user->learnerProfile?->billing_cycle,
                    ],
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'payment_pending' => $user->isPaymentPending(),
            ], 422);
        } catch (ApiErrorException $e) {
            Log::error('Mobile payment confirm failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to confirm payment with Stripe. Please try again.',
            ], 502);
        }
    }

    public function status(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('learnerProfile');

        $paymentPending = $user->isPaymentPending();

        return response()->json([
            'success' => true,
            'data' => [
                'payment_pending' => $paymentPending,
                'full_access' => !$paymentPending && $user->hasVerifiedEmail(),
                'subscription_plan' => $user->learnerProfile?->subscription_plan,
                'billing_cycle' => $user->learnerProfile?->billing_cycle,
                'email_verified' => (bool) $user->hasVerifiedEmail(),
            ],
        ]);
    }
}
