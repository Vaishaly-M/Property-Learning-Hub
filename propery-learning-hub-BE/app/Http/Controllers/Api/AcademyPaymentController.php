<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use App\Services\Payments\StripeAcademyPaymentService;
use App\Support\PasswordSetup;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;
use Stripe\Exception\ApiErrorException;

class AcademyPaymentController extends Controller
{
    public function __construct(
        private readonly StripeAcademyPaymentService $payments,
    ) {}

    public function config(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->payments->getPublicConfig(),
        ]);
    }

    public function createPaymentIntent(Request $request): JsonResponse
    {
        $rules = [
            'agreement_token' => ['required', 'uuid'],
            'paid_invite_token' => ['nullable', 'uuid'],
        ];
        if ($request->filled('email')) {
            $rules['email'] = ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class];
        }

        $validator = Validator::make($request->all(), $rules, [
            'email.unique' => 'This email is already registered. Please log in instead.',
            'agreement_token.required' => 'Please sign the Training Agreement before paying.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => collect($validator->errors()->all())->first() ?: 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $agreements = app(\App\Services\Agreements\TrainingAgreementService::class);
            $agreement = $agreements->requireAwaitingAdminToken(
                $request->string('agreement_token')->toString(),
                \App\Models\TrainingAgreement::TYPE_TRAINING,
            );

            $email = $request->filled('email')
                ? $request->string('email')->toString()
                : $agreement->client_email;

            if (strcasecmp($email, $agreement->client_email) !== 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment email must match the email on your signed Training Agreement (' . $agreement->client_email . ').',
                ], 422);
            }

            if ($request->filled('paid_invite_token')) {
                $paidInviteService = app(\App\Services\PaidUserInviteService::class);
                $paidInvite = $paidInviteService->requireUsableToken(
                    $request->string('paid_invite_token')->toString()
                );
                $paidInviteService->assertEmailMatches($paidInvite, $email);
            }

            $result = $this->payments->createPaymentIntent($email, $agreement->public_token);
            if (!empty($result['payment_id'])) {
                $agreements->linkToPayment($agreement, (int) $result['payment_id']);
                if ($request->filled('paid_invite_token')) {
                    $paidInviteService->linkPayment(
                        $paidInvite,
                        (int) $result['payment_id']
                    );
                }
            }

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (ApiErrorException $e) {
            Log::error('Stripe payment intent failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to start payment. Please try again.',
            ], 502);
        }
    }

    public function verifyPayment(Request $request): JsonResponse
    {
        $request->validate([
            'payment_intent_id' => 'required|string',
        ]);

        try {
            $payment = $this->payments->syncPaymentIntent(
                $request->string('payment_intent_id')->toString(),
            );
        } catch (\Throwable $e) {
            Log::error('Stripe payment verify failed', [
                'payment_intent_id' => $request->input('payment_intent_id'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment not found.',
            ], 404);
        }

        if ($payment->isPaid() && $payment->isAvailableForRegistration()) {
            $this->payments->sendPaymentSuccessEmail($payment);
        }

        return response()->json([
            'success' => true,
            'data' => $this->paymentPayload($payment),
        ]);
    }

    public function registerAfterPayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'payment_intent_id' => ['required', 'string'],
            'agreement_token' => ['required', 'uuid'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'phone_number' => [
                'required',
                'string',
                'max:20',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (PhoneNumber::isRegistered((string) $value)) {
                        $fail('This phone number is already registered.');
                    }
                },
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['sometimes', 'in:learner,instructor'],
            'paid_invite_token' => ['nullable', 'uuid'],
        ], [
            'email.unique' => 'This email is already registered. Please log in instead.',
            'agreement_token.required' => 'Please sign the Training Agreement before registering.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => collect($validator->errors()->all())->first() ?: 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $payment = $this->payments->syncPaymentIntent(
                $request->string('payment_intent_id')->toString(),
            );
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired payment.',
            ], 404);
        }

        if (!$payment->isAvailableForRegistration()) {
            return response()->json([
                'success' => false,
                'message' => $payment->user_id
                    ? 'This payment has already been used to create an account.'
                    : 'Payment has not been completed yet.',
            ], 422);
        }

        if (
            $payment->customer_email
            && strcasecmp($payment->customer_email, $request->string('email')->toString()) !== 0
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Please use the same email address you used for payment (' . $payment->customer_email . ').',
            ], 422);
        }

        try {
            $agreements = app(\App\Services\Agreements\TrainingAgreementService::class);
            $agreement = $agreements->requireAwaitingAdminToken(
                $request->string('agreement_token')->toString(),
                \App\Models\TrainingAgreement::TYPE_TRAINING,
            );
            if (strcasecmp($agreement->client_email, $request->string('email')->toString()) !== 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration email must match your signed Training Agreement (' . $agreement->client_email . ').',
                ], 422);
            }

            $agreementPhone = trim((string) ($agreement->client_phone ?? ''));
            if ($agreementPhone === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Your signed agreement is missing a phone number. Please sign the agreement again.',
                ], 422);
            }

            $submittedPhone = $request->string('phone_number')->toString();
            if ($submittedPhone !== '' && !PhoneNumber::areEquivalent($submittedPhone, $agreementPhone)) {
                $submittedDigits = preg_replace('/\D+/', '', $submittedPhone) ?? '';
                $agreementDigits = preg_replace('/\D+/', '', $agreementPhone) ?? '';
                $suffixMatch = $submittedDigits !== ''
                    && $agreementDigits !== ''
                    && (
                        str_ends_with($submittedDigits, $agreementDigits)
                        || str_ends_with($agreementDigits, $submittedDigits)
                    );
                if (!$suffixMatch) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Registration phone number must match your signed Training Agreement (' . $agreementPhone . ').',
                    ], 422);
                }
            }
            $request->merge(['phone_number' => $agreementPhone]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $paidInvite = null;
        if ($request->filled('paid_invite_token')) {
            try {
                $paidInviteService = app(\App\Services\PaidUserInviteService::class);
                $paidInvite = $paidInviteService->requireUsableToken(
                    $request->string('paid_invite_token')->toString()
                );
                $paidInviteService->assertEmailMatches(
                    $paidInvite,
                    $request->string('email')->toString()
                );
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        $user = DB::transaction(function () use ($request, $payment, $agreement, $agreements) {
            $role = $request->string('role', 'learner')->toString();

            $user = User::create([
                'first_name' => $request->string('first_name')->toString(),
                'last_name' => $request->string('last_name')->toString(),
                'email' => $request->string('email')->toString(),
                'phone_number' => PhoneNumber::normalizeForStorage(
                    $request->string('phone_number')->toString()
                ),
                'password' => Hash::make($request->string('password')->toString()),
                'role' => $role,
            ]);

            if ($role === 'learner') {
                $user->learnerProfile()->create([
                    'subscription_plan' => 'pro',
                    'billing_cycle' => 'yearly',
                    'profile_completed' => false,
                ]);
            } else {
                $user->instructorProfile()->create([
                    'instructor_plan' => 'pro',
                    'billing_cycle' => 'yearly',
                    'profile_completed' => false,
                ]);
            }

            $payment->update([
                'user_id' => $user->id,
                'status' => 'consumed',
                'customer_email' => $user->email,
            ]);

            $agreements->linkToUser($agreement, (int) $user->id);
            $agreements->linkToPayment($agreement, (int) $payment->id);

            return $user;
        });

        if ($paidInvite) {
            app(\App\Services\PaidUserInviteService::class)
                ->markJoined($paidInvite, (int) $user->id);
        }

        \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);

        [, $setPasswordUrl] = PasswordSetup::issue($user);

        $payment->refresh();
        $this->payments->sendEnrollmentConfirmationEmail($payment, $user, $setPasswordUrl);

        $verificationEmailSent = true;
        try {
            $user->notify(new VerifyEmailNotification($setPasswordUrl));
        } catch (\Throwable $e) {
            $verificationEmailSent = false;
            Log::error('Failed to send verification email after payment registration', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => $verificationEmailSent
                ? 'Account created! Set your password below or use the link in your email, then verify your email to log in.'
                : 'Account created, but verification email could not be sent. Use resend on the verify page.',
            'verification_email_sent' => $verificationEmailSent,
            'set_password_url' => $setPasswordUrl,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'redirect_to' => '/verify-email',
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'role' => $user->role,
                'profile_completed' => false,
                'email_verified' => false,
            ],
        ], 201);
    }

    public function webhook(Request $request): JsonResponse
    {
        try {
            $this->payments->handleWebhook(
                $request->getContent(),
                $request->header('Stripe-Signature')
            );
        } catch (\Throwable $e) {
            Log::error('Stripe webhook failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Webhook error'], 400);
        }

        return response()->json(['received' => true]);
    }

    private function paymentPayload($payment): array
    {
        return [
            'status' => $payment->status,
            'paid' => $payment->isPaid(),
            'available_for_registration' => $payment->isAvailableForRegistration(),
            'customer_email' => $payment->customer_email,
            'formatted_amount' => $this->payments->getPublicConfig()['formatted_amount'],
            'payment_intent_id' => $payment->stripe_payment_intent_id,
        ];
    }
}
