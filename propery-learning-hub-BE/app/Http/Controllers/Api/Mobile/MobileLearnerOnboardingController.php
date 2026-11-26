<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\TrainingAgreement;
use App\Models\User;
use App\Services\Agreements\AgreementDocumentFactory;
use App\Services\Agreements\TrainingAgreementService;
use App\Services\Payments\StripeAcademyPaymentService;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;

/**
 * Mobile learner onboarding:
 * 1) Get agreement info
 * 2) Sign training agreement
 * 3) Register (set password) with payment_pending = true
 * 4) Verify email → dashboard (app should check payment_pending)
 */
class MobileLearnerOnboardingController extends Controller
{
    public function __construct(
        private readonly TrainingAgreementService $agreements,
        private readonly StripeAcademyPaymentService $payments,
    ) {}

    public function info(): JsonResponse
    {
        $cfg = TrainingAgreement::configForType(TrainingAgreement::TYPE_TRAINING);
        $payment = $this->payments->getPublicConfig();
        $feePence = (int) ($cfg['fee_amount_pence'] ?? $payment['amount']);

        return response()->json([
            'success' => true,
            'data' => [
                'agreement_type' => TrainingAgreement::TYPE_TRAINING,
                'version' => $cfg['version'] ?? null,
                'company_name' => $cfg['company_name'] ?? null,
                'company_number' => $cfg['company_number'] ?? null,
                'company_address' => $cfg['company_address'] ?? null,
                'trading_as' => $cfg['trading_as'] ?? null,
                'document_title' => 'Training & Membership Services Agreement',
                'document_paragraphs' => AgreementDocumentFactory::paragraphs(TrainingAgreement::TYPE_TRAINING),
                'fee_amount_pence' => $feePence,
                'fee_currency' => $cfg['fee_currency'] ?? $payment['currency'],
                'formatted_fee' => '£' . number_format($feePence / 100, 2),
                'privacy_policy_url' => $cfg['privacy_policy_url'] ?? null,
                'academy_signatory' => [
                    'name' => $cfg['academy_signatory_name'] ?? '',
                    'position' => $cfg['academy_signatory_position'] ?? '',
                ],
                'payment' => [
                    'publishable_key' => $payment['publishable_key'],
                    'product_name' => $payment['product_name'],
                    'amount' => $payment['amount'],
                    'currency' => $payment['currency'],
                    'formatted_amount' => $payment['formatted_amount'],
                ],
                'flow' => [
                    'steps' => [
                        'get_info',
                        'sign_agreement',
                        'register',
                        'verify_email',
                        'dashboard',
                        'pay_if_pending',
                    ],
                    'notes' => 'After email verification the learner can open the dashboard. If payment_pending is true, the app must collect payment before unlocking full access.',
                ],
            ],
        ]);
    }

    public function checkEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $email = $request->string('email')->toString();
        $registered = User::query()->whereRaw('LOWER(email) = ?', [strtolower($email)])->exists();

        return response()->json([
            'success' => true,
            'data' => [
                'email' => strtolower($email),
                'registered' => $registered,
                'available' => !$registered,
                'message' => $registered
                    ? 'This email is already registered. Please log in instead.'
                    : 'Email is available.',
            ],
        ]);
    }

    public function checkPhone(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'max:30'],
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $phone = $request->string('phone')->toString();
        $registered = PhoneNumber::isRegistered($phone);

        return response()->json([
            'success' => true,
            'data' => [
                'phone' => PhoneNumber::normalizeForStorage($phone),
                'registered' => $registered,
                'available' => !$registered,
                'message' => $registered
                    ? 'This phone number is already registered. Please log in instead.'
                    : 'Phone number is available.',
            ],
        ]);
    }

    public function signAgreement(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_full_name' => ['required', 'string', 'max:255'],
            'client_address' => ['required', 'string', 'max:2000'],
            'client_dob' => ['required', 'date', 'before:today'],
            'client_email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (User::query()->whereRaw('LOWER(email) = ?', [strtolower((string) $value)])->exists()) {
                        $fail('This email is already registered. Please log in instead.');
                    }
                },
            ],
            'client_phone' => [
                'required',
                'string',
                'max:30',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (PhoneNumber::isRegistered((string) $value)) {
                        $fail('This phone number is already registered. Please log in instead.');
                    }
                },
            ],
            'payment_plan' => ['nullable', 'in:full,instalments'],
            'schedule_notes' => ['nullable', 'string', 'max:2000'],
            'client_signature_data' => ['required', 'string', 'min:100'],
            'accepted_terms' => ['accepted'],
        ], [
            'accepted_terms.accepted' => 'You must accept the Training & Membership Agreement to continue.',
            'client_signature_data.required' => 'Please draw your signature before submitting.',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        if (!str_starts_with($request->string('client_signature_data')->toString(), 'data:image/')) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid signature format. Expected a data:image/... signature.',
            ], 422);
        }

        $cfg = TrainingAgreement::configForType(TrainingAgreement::TYPE_TRAINING);

        $agreement = TrainingAgreement::create([
            'agreement_type' => TrainingAgreement::TYPE_TRAINING,
            'status' => TrainingAgreement::STATUS_CLIENT_SIGNED,
            'agreement_version' => $cfg['version'] ?? '1.0',
            'client_full_name' => $request->string('client_full_name')->toString(),
            'client_address' => $request->string('client_address')->toString(),
            'client_dob' => $request->input('client_dob'),
            'client_email' => strtolower($request->string('client_email')->toString()),
            'client_phone' => PhoneNumber::normalizeForStorage((string) $request->input('client_phone')),
            'fee_amount_pence' => (int) ($cfg['fee_amount_pence'] ?? 0),
            'fee_currency' => $cfg['fee_currency'] ?? 'gbp',
            'payment_plan' => $request->input('payment_plan', 'full'),
            'schedule_notes' => $request->input('schedule_notes'),
            'client_signature_data' => $request->string('client_signature_data')->toString(),
            'client_signed_at' => now(),
            'client_signed_ip' => $request->ip(),
            'client_user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agreement signed successfully.',
            'data' => [
                'agreement_token' => $agreement->public_token,
                'agreement' => $agreement->toPublicArray(),
                'next_step' => 'register',
            ],
        ], 201);
    }

    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'agreement_token' => ['required', 'uuid'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'phone_number' => ['required', 'string', 'max:30'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            $agreement = $this->agreements->requireAwaitingAdminToken(
                $request->string('agreement_token')->toString(),
                TrainingAgreement::TYPE_TRAINING,
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        if ($agreement->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'This agreement has already been used to create an account. Please log in.',
            ], 422);
        }

        if (strcasecmp($request->string('email')->toString(), $agreement->client_email) !== 0) {
            return response()->json([
                'success' => false,
                'message' => 'Registration email must match your signed agreement (' . $agreement->client_email . ').',
            ], 422);
        }

        $submittedPhone = (string) $request->input('phone_number');
        $agreementPhone = (string) $agreement->client_phone;
        if (!PhoneNumber::areEquivalent($submittedPhone, $agreementPhone)) {
            return response()->json([
                'success' => false,
                'message' => 'Registration phone number must match your signed agreement (' . $agreementPhone . ').',
            ], 422);
        }

        if (PhoneNumber::isRegistered($agreementPhone)) {
            return response()->json([
                'success' => false,
                'message' => 'This phone number is already registered. Please log in instead.',
            ], 422);
        }

        $user = User::create([
            'first_name' => $request->string('first_name')->toString(),
            'last_name' => $request->string('last_name')->toString(),
            'email' => strtolower($request->string('email')->toString()),
            'phone_number' => PhoneNumber::normalizeForStorage($agreementPhone),
            'password' => Hash::make($request->string('password')->toString()),
            'role' => 'learner',
            'status' => 'pending',
        ]);

        $user->learnerProfile()->create([
            'subscription_plan' => 'free',
            'billing_cycle' => 'yearly',
            'payment_pending' => true,
            'profile_completed' => false,
        ]);

        $this->agreements->linkToUser($agreement, (int) $user->id);
        \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);

        $verificationEmailSent = true;
        $message = 'Registration successful. Please verify your email address.';
        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            $verificationEmailSent = false;
            $message = 'Registration successful, but we could not send the verification email. Use resend verification.';
            Log::error('Mobile register: failed to send verification email', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        $token = $user->createToken('mobile_auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => $message,
            'email_verification_required' => true,
            'verification_email_sent' => $verificationEmailSent,
            'payment_pending' => true,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user->fresh('learnerProfile'), emailVerified: false),
            'next_step' => 'verify_email',
        ], 201);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id' => ['required', 'integer'],
            'hash' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $user = User::query()->find($request->integer('id'));
        if (!$user || !$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification link.',
            ], 422);
        }

        if (!hash_equals(sha1($user->email), (string) $request->input('hash'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification link.',
            ], 422);
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        if ($user->status === 'pending') {
            $user->forceFill(['status' => 'active'])->save();
        }

        try {
            $this->agreements->tryAutoCompleteAfterEmailVerification($user);
        } catch (\Throwable $e) {
            Log::warning('Mobile verify: agreement auto-complete failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);
        $user->refresh()->load('learnerProfile');

        $token = $user->createToken('mobile_auth_token')->plainTextToken;
        $paymentPending = $user->isPaymentPending();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'payment_pending' => $paymentPending,
            'user' => $this->userPayload($user),
            'next_step' => $paymentPending ? 'pay' : 'dashboard',
            'redirect_to' => 'dashboard',
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only learners can use this endpoint.',
            ], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email is already verified.',
                'payment_pending' => $user->isPaymentPending(),
                'next_step' => $user->isPaymentPending() ? 'pay' : 'dashboard',
            ]);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to send verification email right now.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('learnerProfile');

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only learners can use this endpoint.',
            ], 403);
        }

        $paymentPending = $user->isPaymentPending();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $this->userPayload($user, emailVerified: (bool) $user->hasVerifiedEmail()),
                'payment_pending' => $paymentPending,
                'full_access' => !$paymentPending && $user->hasVerifiedEmail(),
                'profile' => $user->learnerProfile,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($request->string('email')->toString())])
            ->first();

        if (!$user || !Hash::check($request->string('password')->toString(), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 422);
        }

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'This mobile login is for learners only.',
            ], 403);
        }

        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email before logging in.',
                'email_verification_required' => true,
            ], 403);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not active. Please contact support.',
            ], 403);
        }

        \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);
        $user->load('learnerProfile');
        $token = $user->createToken('mobile_auth_token')->plainTextToken;
        $paymentPending = $user->isPaymentPending();

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'payment_pending' => $paymentPending,
            'full_access' => !$paymentPending,
            'user' => $this->userPayload($user),
            'next_step' => $paymentPending ? 'pay' : 'dashboard',
        ]);
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user, bool $emailVerified = true): array
    {
        $profile = $user->learnerProfile;

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            'role' => $user->role,
            'status' => $user->status ?? 'active',
            'profile_completed' => $user->isProfileCompleted(),
            'email_verified' => $emailVerified,
            'payment_pending' => (bool) optional($profile)->payment_pending,
            'subscription_plan' => optional($profile)->subscription_plan,
            'billing_cycle' => optional($profile)->billing_cycle,
        ];
    }

    private function validationError($validator): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors(),
        ], 422);
    }
}
