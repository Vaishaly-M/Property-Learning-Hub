<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
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
            'role' => ['required', 'in:learner,instructor'],
            'agreement_token' => ['required', 'uuid'],
            'invite_token' => ['nullable', 'uuid'],
        ], [
            'email.unique' => 'This email is already registered. Please log in or use another email.',
            'phone_number.unique' => 'This phone number is already registered.',
            'agreement_token.required' => 'Please sign the Training Agreement before registering.',
        ]);

        if ($validator->fails()) {
            $errors = $validator->errors();
            $firstError = collect($errors->messages())->flatten()->first();

            return response()->json([
                'message' => $firstError ?: 'Validation failed',
                'errors' => $errors,
            ], 422);
        }

        try {
            $agreements = app(\App\Services\Agreements\TrainingAgreementService::class);
            $agreement = $agreements->requireAwaitingAdminToken(
                $request->string('agreement_token')->toString()
            );
            if ($request->filled('invite_token') && !$agreement->isFreeMembership()) {
                return response()->json([
                    'message' => 'Free registration requires the Free Membership Agreement.',
                    'errors' => ['agreement_token' => ['Invalid agreement type for free registration.']],
                ], 422);
            }
            if (strcasecmp($agreement->client_email, $request->string('email')->toString()) !== 0) {
                return response()->json([
                    'message' => 'Registration email must match your signed Training Agreement (' . $agreement->client_email . ').',
                    'errors' => ['email' => ['Must match signed agreement email.']],
                ], 422);
            }
            $agreementPhone = trim((string) ($agreement->client_phone ?? ''));
            if ($agreementPhone === '') {
                return response()->json([
                    'message' => 'Your signed agreement is missing a phone number. Please sign the agreement again.',
                    'errors' => ['phone_number' => ['Agreement phone number is missing.']],
                ], 422);
            }

            $submittedPhone = $request->string('phone_number')->toString();
            // Accept any equivalent formatting; then always store the agreement value.
            if ($submittedPhone !== '' && !PhoneNumber::areEquivalent($submittedPhone, $agreementPhone)) {
                // Soft fallback: if the form only added/removed a country-code prefix, still accept.
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
                        'message' => 'Registration phone number must match your signed agreement (' . $agreementPhone . ').',
                        'errors' => ['phone_number' => ['Must match signed agreement phone number.']],
                    ], 422);
                }
            }
            // Always persist the agreement phone so country-code UI quirks cannot diverge.
            $request->merge(['phone_number' => $agreementPhone]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['agreement_token' => [$e->getMessage()]],
            ], 422);
        }

        $invite = null;
        if ($request->filled('invite_token')) {
            try {
                $inviteService = app(\App\Services\FreeRegistrationInviteService::class);
                $invite = $inviteService->requireUsableToken(
                    $request->string('invite_token')->toString()
                );
                $inviteService->assertEmailMatches($invite, $request->string('email')->toString());
            } catch (\InvalidArgumentException $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => ['invite_token' => [$e->getMessage()]],
                ], 422);
            }
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone_number' => PhoneNumber::normalizeForStorage((string) $request->phone_number),
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        // Create profile based on role
        $plan = $invite ? 'pro' : 'free';
        if ($request->role === 'learner') {
            $user->learnerProfile()->create([
                'subscription_plan' => $plan,
                'billing_cycle' => $invite ? 'yearly' : 'monthly',
                'profile_completed' => false,
            ]);
        } else {
            $user->instructorProfile()->create([
                'instructor_plan' => $plan,
                'billing_cycle' => $invite ? 'yearly' : 'monthly',
                'profile_completed' => false,
            ]);
        }

        $agreements->linkToUser($agreement, (int) $user->id);

        if ($invite) {
            app(\App\Services\FreeRegistrationInviteService::class)
                ->markJoined($invite, (int) $user->id, $request->string('email')->toString());
        }

        $verificationEmailSent = true;
        $registrationMessage = 'Registration successful. Please verify your email address.';
        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            $verificationEmailSent = false;
            $registrationMessage = 'Registration successful, but we could not send verification email right now. Please use resend verification from the verify email page.';
            Log::error('Failed to send verification email on register', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        $this->ensureRoleAssigned($user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => $registrationMessage,
            'email_verification_required' => true,
            'verification_email_sent' => $verificationEmailSent,
            'free_invite_pending' => (bool) $invite,
            'user' => $this->authUserPayload($user, emailVerified: false),
            'redirect_to' => '/verify-email',
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

public function login(Request $request)
{
    $validator = Validator::make($request->all(), [
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid login credentials'
        ], 401);
    }

    $user = Auth::user();

    if ($user->status === 'suspended') {
        return response()->json([
            'success' => false,
            'message' => 'Your account has been suspended. Please contact support.'
        ], 403);
    }

    if (!$user->hasVerifiedEmail() && !$user->isAdmin()) {
        return response()->json([
            'success' => false,
            'message' => 'Please verify your email address before logging in. Check your inbox for the verification link.',
            'email_verification_required' => true,
        ], 403);
    }

    // === NEW: Update login streak and check badges ===
    try {
        $streak = \App\Models\UserLoginStreak::firstOrCreate(
            ['user_id' => $user->id],
            ['last_login_date' => now()->toDateString(), 'current_streak' => 0]
        );
        $streak->recordLogin();
        
        // Check for login badges
        app(\App\Services\BadgeService::class)->checkAndAwardBadges($user, 'login');
    } catch (\Throwable $e) {
        // Log but don't block login
        \Illuminate\Support\Facades\Log::error('Login streak update failed: ' . $e->getMessage());
    }

    $this->sendWelcomeGuideEmail($user);

    $this->ensureRoleAssigned($user);
    $user->load('roles.permissions');

    $token = $user->createToken('auth_token')->plainTextToken;

    // Determine redirect path
    $redirectTo = $this->getLoginRedirectPath($user);

    $freeInvitePending = $user->joinedViaFreeInvite();

    return response()->json([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
                'profile_completed' => $user->isProfileCompleted(),
                'free_invite_pending' => $freeInvitePending,
                'payment_pending' => $user->isPaymentPending(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
            'redirect_to' => $redirectTo,
            'free_invite_pending' => $freeInvitePending,
            'payment_pending' => $user->isPaymentPending(),
        ]
    ]);
}

private function getLoginRedirectPath($user)
{
    if ($user->isAdmin()) {
        return '/admin/dashboard';
    }

    // After login, check if profile is completed
    if (!$user->isProfileCompleted()) {
        // Profile not completed - go to profile setup
        return $user->role === 'learner' 
            ? '/profile/learner' 
            : '/profile/instructor';
    }
    
    // Profile is completed - go to appropriate dashboard
    if ($user->role === 'learner') {
        return '/learn';
    }

    if ($user->role === 'instructor') {
        return '/instructor/dashboard';
    }

    return '/admin/dashboard';
}

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function getUserProfileSetupInfo(Request $request)
    {
        $user = $request->user()->load(['learnerProfile', 'instructorProfile']);
        
        $responseData = [
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
                'status' => $user->status ?? 'active',
                'profile_completed' => $user->isProfileCompleted(),
                'free_invite_pending' => $user->joinedViaFreeInvite(),
                'payment_pending' => $user->isPaymentPending(),
            ]
        ];
        
        // Add profile data if exists
        if ($user->isLearner() && $user->learnerProfile) {
            $responseData['profile'] = $user->learnerProfile;
        } elseif ($user->isInstructor() && $user->instructorProfile) {
            $responseData['profile'] = $user->instructorProfile;
        }
        
        return response()->json([
            'success' => true,
            'data' => $responseData
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        $this->ensureRoleAssigned($user);
        $user->load('roles.permissions');
        $profile = null;

        if ($user->isLearner()) {
            $profile = $user->learnerProfile;
        } else {
            $profile = $user->instructorProfile;
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
                'profile_completed' => $user->isProfileCompleted(),
                'free_invite_pending' => $user->joinedViaFreeInvite(),
                'payment_pending' => $user->isPaymentPending(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
            'profile' => $profile,
        ]);
    }
    // In AuthController.php or a new ProfileController.php
public function getProfile(Request $request)
{
    $user = $request->user();
    
    $profile = null;
    $subscription = null;
    
    if ($user->isLearner() && $user->learnerProfile) {
        $profile = $user->learnerProfile;
        $subscription = [
            'level' => $profile->subscription_plan ?? 'free',
            'billing_cycle' => $profile->billing_cycle ?? 'monthly',
            'status' => $profile->subscription_status ?? 'active',
        ];
    } elseif ($user->isInstructor() && $user->instructorProfile) {
        $profile = $user->instructorProfile;
        $subscription = [
            'level' => $profile->instructor_plan ?? 'free',
            'billing_cycle' => $profile->billing_cycle ?? 'monthly',
            'status' => 'active',
        ];
    }
    
    return response()->json([
        'success' => true,
        'data' => [
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
                'profile_completed' => $user->isProfileCompleted(),
            ],
            'profile' => $profile,
            'subscription' => $subscription,
        ]
    ]);
}
    public function verifyEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => ['required', 'integer'],
            'hash' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification link.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::findOrFail($request->id);

        if (!hash_equals((string) $request->hash, sha1($user->getEmailForVerification()))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification link.',
            ], 400);
        }

        if ($user->hasVerifiedEmail()) {
            $this->activateUserAfterEmailVerification($user);

            app(\App\Services\Agreements\TrainingAgreementService::class)
                ->tryAutoCompleteAfterEmailVerification($user->fresh());

            return response()->json(
                $this->verificationSuccessPayload($user, 'Email already verified.')
            );
        }

        $user->markEmailAsVerified();
        $this->activateUserAfterEmailVerification($user);

        app(\App\Services\Agreements\TrainingAgreementService::class)
            ->tryAutoCompleteAfterEmailVerification($user->fresh());

        return response()->json(
            $this->verificationSuccessPayload($user, 'Email verified successfully!')
        );
    }

    public function resendVerificationEmail(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email is already verified.',
            ]);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            Log::error('Failed to resend verification email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not send verification email. Please check mail configuration or try again later.',
            ], 503);
        }

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent. Please check your inbox.',
        ]);
    }

    public function updateUserProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20', 'unique:users,phone_number,' . $user->id],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
            ],
        ]);
    }

    public function changeUserPassword(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'current_password' => ['required'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    private function ensureRoleAssigned(User $user): void
    {
        \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);
    }

    /** @return array<string, mixed> */
    private function authUserPayload(User $user, bool $emailVerified = true): array
    {
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
            'free_invite_pending' => $user->joinedViaFreeInvite(),
            'payment_pending' => $user->isPaymentPending(),
        ];
    }

    private function activateUserAfterEmailVerification(User $user): void
    {
        if ($user->status === 'pending') {
            $user->forceFill(['status' => 'active'])->save();
        }
    }

    /** @return array<string, mixed> */
    private function verificationSuccessPayload(User $user, string $message): array
    {
        $this->ensureRoleAssigned($user);
        $user->refresh();

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'success' => true,
            'message' => $message,
            'redirect_to' => $user->getPostVerificationRoute(),
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->authUserPayload($user),
            'free_invite_pending' => $user->joinedViaFreeInvite(),
            'payment_pending' => $user->isPaymentPending(),
        ];
    }
    private function sendWelcomeGuideEmail(User $user): void
{
    // Check if welcome email already sent
    if ($user->welcome_email_sent) {
        return;
    }

    try {
        \Mail::to($user->email)->send(new \App\Mail\WelcomeGuideMail($user));
        $user->update(['welcome_email_sent' => true]);
    } catch (\Throwable $e) {
        Log::error('Failed to send welcome guide email', [
            'user_id' => $user->id,
            'email' => $user->email,
            'error' => $e->getMessage(),
        ]);
    }
}
}