<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\LearnerProfile;
use App\Models\User;
use App\Models\UserLoginStreak;
use App\Services\BadgeService;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Models\LessonProgress;
use App\Models\MeetingRegistration;

class LearnerMyProfileController extends Controller
{
    protected BadgeService $badgeService;

    public function __construct(BadgeService $badgeService)
    {
        $this->badgeService = $badgeService;
    }

    public function getCompleteProfile(Request $request)
    {
        try {
            $user = $request->user()->load('learnerProfile');

            if (!$user->isLearner()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied.'
                ], 403);
            }

            $profile = $user->learnerProfile ?? LearnerProfile::create([
                'user_id' => $user->id,
                'profile_completed' => false,
            ]);

            $profile->refresh();

            // Get profile data safely
            $profileData = $profile->toArray();
            
            // Get settings safely
            $settings = [];
            if (method_exists($profile, 'resolvedSettings')) {
                $settings = $profile->resolvedSettings();
            } else {
                // Fallback settings
                $settings = [
                    'email_notifications' => true,
                    'theme' => 'light',
                    'language' => 'English',
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'full_name' => trim("{$user->first_name} {$user->last_name}"),
                        'email' => $user->email,
                        'phone' => $user->phone_number,
                        'phone_number' => $user->phone_number,
                        'avatar' => $profile->profile_photo_url,
                        'avatar_initials' => strtoupper(
                            substr($user->first_name ?? '', 0, 1) .
                            substr($user->last_name ?? '', 0, 1)
                        ),
                        'join_date' => $user->created_at->format('Y-m-d'),
                    ],

                    'profile' => array_merge($profileData, [
                        'settings' => $settings,
                    ]),

                    'subscription' => [
                        'level' => $profile->subscription_plan ?? 'free',
                        'billing_cycle' => $profile->billing_cycle ?? 'monthly',
                        'status' => 'active',
                    ],

                    'stats' => $this->calculateUserStats($user),
                    'certificates' => $this->getUserCertificates($user),
                    'badges' => $this->getUserBadges($user),
                    'recent_activity' => $this->getUserRecentActivity($user),
                    'payment_history' => $this->getUserPaymentHistory($user),
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error loading profile: ' . $e->getMessage()
            ], 500);
        }
    }

    private function calculateUserStats($user)
    {
        try {
            return [
                'videosWatched' => LessonProgress::where('user_id', $user->id)
                    ->where('is_completed', true)
                    ->count(),
                'meetingsAttended' => MeetingRegistration::where('learner_id', $user->id)
                    ->where('status', 'attended')
                    ->count(),
                'certificatesEarned' => Certificate::where('user_id', $user->id)->count(),
                'hoursLearned' => round(LessonProgress::where('user_id', $user->id)->sum('watch_time') / 3600, 1),
                'dealsAnalyzed' => $user->deals()->count(),
                'contactsAdded' => 0,
            ];
        } catch (\Exception $e) {
            return [
                'videosWatched' => 0,
                'meetingsAttended' => 0,
                'certificatesEarned' => 0,
                'hoursLearned' => 0,
                'dealsAnalyzed' => 0,
                'contactsAdded' => 0,
            ];
        }
    }

    private function getUserCertificates($user)
    {
        try {
            return Certificate::where('user_id', $user->id)
                ->orderBy('issued_at', 'desc')
                ->get()
                ->map(function ($cert) {
                    return [
                        'id' => $cert->id,
                        'title' => $cert->title,
                        'issuer' => $cert->issuer,
                        'description' => $cert->description,
                        'issueDate' => $cert->issued_at->format('Y-m-d'),
                        'verificationCode' => $cert->verification_code,
                        'downloadUrl' => route('api.certificates.download', ['code' => $cert->verification_code]),
                    ];
                })
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getUserBadges($user)
    {
        try {
            // Check if the badges relationship exists
            if (!method_exists($user, 'badges')) {
                return [];
            }
            
            return $user->badges()
                ->withPivot('earned_at', 'metadata')
                ->orderBy('pivot_earned_at', 'desc')
                ->get()
                ->map(function ($badge) {
                    return [
                        'id' => $badge->id,
                        'title' => $badge->title,
                        'description' => $badge->description,
                        'icon' => $badge->icon,
                        'category' => $badge->category,
                        'tier' => $badge->tier,
                        'earnedDate' => $badge->pivot->earned_at->format('Y-m-d'),
                        'metadata' => $badge->pivot->metadata,
                    ];
                })
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getUserRecentActivity($user)
    {
        return [];
    }

    private function getUserPaymentHistory($user)
    {
        return [];
    }

    // Get certificates (called from /profile/certificates)
    public function getCertificates(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->getUserCertificates($user)
        ]);
    }

    // Get badges (called from /profile/badges)
    public function getBadges(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->getUserBadges($user)
        ]);
    }

    // Get activities
    public function getActivities(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->getUserRecentActivity($user)
        ]);
    }

    // Get payment history
    public function getPaymentHistory(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->getUserPaymentHistory($user)
        ]);
    }

    // Update profile
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        $profile = $user->learnerProfile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            // User fields
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'phone_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            
            // Personal info fields
            'bio' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'gender' => ['sometimes', 'nullable', 'in:male,female,other,prefer-not-to-say'],
            
            // Investment info fields
            'job_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company' => ['sometimes', 'nullable', 'string', 'max:255'],
            'years_of_experience' => ['sometimes', 'nullable', 'in:beginner,intermediate,advanced,expert'],
            'investment_budget' => ['sometimes', 'nullable', 'in:under-50k,50k-200k,200k-500k,500k-1m,over-1m'],
            'country' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'alternate_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'linkedin_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            
            // Array fields
            'investment_interests' => ['sometimes', 'array'],
            'investment_interests.*' => ['string'],
            'learning_preferences' => ['sometimes', 'array'],
            'learning_preferences.*' => ['string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Update user information
            if ($request->has('first_name')) {
                $user->first_name = $request->first_name;
            }
            if ($request->has('last_name')) {
                $user->last_name = $request->last_name;
            }
            if ($request->exists('phone') || $request->exists('phone_number')) {
                $user->phone_number = $request->input('phone_number', $request->input('phone'));
            }
            $user->save();

            $profileScalarFields = [
                'date_of_birth',
                'gender',
                'bio',
                'job_title',
                'company',
                'years_of_experience',
                'investment_budget',
                'country',
                'city',
                'linkedin_url',
                'alternate_phone',
            ];

            foreach ($profileScalarFields as $field) {
                if ($request->exists($field)) {
                    $profile->{$field} = $request->input($field);
                }
            }

            // Handle array fields
            if ($request->has('investment_interests')) {
                $profile->investment_interests = $request->investment_interests;
            }
            
            if ($request->has('learning_preferences')) {
                $profile->learning_preferences = $request->learning_preferences;
            }

            $profile->save();

            $profile->refresh();

            // Check for profile completion badge
            if ($profile->profile_completed && $this->badgeService) {
                $this->badgeService->checkAndAwardBadges($user, 'profile_completed');
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => [
                    'profile' => $profile,
                    'user' => [
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'full_name' => $user->first_name . ' ' . $user->last_name,
                        'email' => $user->email,
                        'phone' => $user->phone_number,
                        'phone_number' => $user->phone_number,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update profile picture
    public function updateProfilePicture(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        $profile = $user->learnerProfile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'profile_image' => 'required_without:profile_photo_path|image|max:2048',
            'profile_photo_path' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Delete old profile photo if exists
            if ($profile->profile_photo_path) {
                MediaStorage::delete($profile->profile_photo_path);
            }

            if ($request->filled('profile_photo_path')) {
                $path = DirectUpload::resolvePath($request, 'profile_photo_path');
                if ($path instanceof \Illuminate\Http\JsonResponse) {
                    return $path;
                }
            } else {
                $path = MediaStorage::store($request->file('profile_image'), 'profile-photos');
            }
            $profile->profile_photo_path = $path;
            $profile->save();

            return response()->json([
                'success' => true,
                'message' => 'Profile picture updated successfully',
                'image_url' => $profile->profile_photo_url
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile picture: ' . $e->getMessage()
            ], 500);
        }
    }

    public function uploadProofOfAddress(Request $request)
    {
        $user = $request->user();

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.',
            ], 403);
        }

        $profile = $user->learnerProfile;
        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'proof_of_address' => 'required_without:proof_of_address_path|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'proof_of_address_path' => 'nullable|string|max:500',
            'proof_of_address_original_name' => 'nullable|string|max:255',
            'proof_of_address_size' => 'nullable|integer|min:0',
            'proof_of_address_mime' => 'nullable|string|max:120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first() ?: 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            if ($profile->proof_of_address_path) {
                MediaStorage::delete($profile->proof_of_address_path, true);
            }

            $originalName = null;
            $mime = null;
            $size = null;

            if ($request->filled('proof_of_address_path')) {
                $meta = DirectUpload::resolveFileMeta(
                    $request,
                    'proof_of_address_path',
                    'proof_of_address_original_name',
                    'proof_of_address_size',
                    'proof_of_address_mime',
                );
                if ($meta instanceof \Illuminate\Http\JsonResponse) {
                    return $meta;
                }
                if ($meta === null) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Uploaded file path is missing.',
                    ], 422);
                }
                $path = $meta['path'];
                $originalName = $meta['name'];
                $size = $meta['size'] ?: null;
                $mime = $meta['mime'];
            } else {
                $file = $request->file('proof_of_address');
                $path = MediaStorage::storePrivate($file, 'learner-id-docs');
                $originalName = $file->getClientOriginalName();
                $mime = $file->getClientMimeType() ?: $file->getMimeType();
                $size = $file->getSize() ?: null;
            }

            $profile->update([
                'proof_of_address_path' => $path,
                'proof_of_address_original_name' => $originalName,
                'proof_of_address_mime' => $mime,
                'proof_of_address_size' => $size,
                'proof_of_address_uploaded_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Proof of address uploaded successfully.',
                'data' => $profile->fresh()->proof_of_address,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload proof of address: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function downloadProofOfAddress(Request $request)
    {
        $user = $request->user();

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.',
            ], 403);
        }

        $profile = $user->learnerProfile;
        if (!$profile || !$profile->proof_of_address_path) {
            return response()->json([
                'success' => false,
                'message' => 'No proof of address document uploaded.',
            ], 404);
        }

        $name = $profile->proof_of_address_original_name
            ?: ('proof-of-address-' . $user->id);
        $mime = $profile->proof_of_address_mime;

        return MediaStorage::download(
            $profile->proof_of_address_path,
            $name,
            $mime,
            true,
        );
    }

    public function deleteProofOfAddress(Request $request)
    {
        $user = $request->user();

        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.',
            ], 403);
        }

        $profile = $user->learnerProfile;
        if (!$profile || !$profile->proof_of_address_path) {
            return response()->json([
                'success' => false,
                'message' => 'No proof of address document uploaded.',
            ], 404);
        }

        MediaStorage::delete($profile->proof_of_address_path, true);

        $profile->update([
            'proof_of_address_path' => null,
            'proof_of_address_original_name' => null,
            'proof_of_address_mime' => null,
            'proof_of_address_size' => null,
            'proof_of_address_uploaded_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proof of address removed.',
            'data' => $profile->fresh()->proof_of_address,
        ]);
    }

    // Update settings
    public function updateSettings(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'email_notifications' => ['sometimes', 'boolean'],
            'emailNotifications' => ['sometimes', 'boolean'],
            'theme' => ['sometimes', 'in:light,dark,auto'],
            'language' => ['sometimes', 'string', 'max:50'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $profile = $user->learnerProfile ?? LearnerProfile::create([
                'user_id' => $user->id,
                'profile_completed' => false,
            ]);

            // Get current settings or create default
            $settings = $profile->settings ?? [];
            if (is_string($settings)) {
                $settings = json_decode($settings, true) ?? [];
            }
            
            // Merge new settings
            if ($request->has('email_notifications') || $request->has('emailNotifications')) {
                $settings['email_notifications'] = $request->boolean('email_notifications') ?? $request->boolean('emailNotifications') ?? true;
            }
            if ($request->has('theme')) {
                $settings['theme'] = $request->input('theme');
            }
            if ($request->has('language')) {
                $settings['language'] = $request->input('language');
            }
            
            $profile->settings = $settings;
            $profile->save();

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => [
                    'settings' => $settings,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    // Change password
    public function changePassword(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => collect($validator->errors()->all())->first() ?: 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if (empty($user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'No password is set on this account. Please use the set password link from your registration email.',
            ], 422);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 422);
        }

        try {
            $user->password = Hash::make($request->new_password);
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to change password: ' . $e->getMessage()
            ], 500);
        }
    }

    // Export data
    public function exportData(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data export feature is under development',
            'data' => []
        ]);
    }

    // Delete account
    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password'
            ], 400);
        }

        try {
            $user->delete();

            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'success' => true,
                'message' => 'Account deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete account: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update subscription
    public function updateSubscription(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        $profile = $user->learnerProfile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'subscription_plan' => ['required', 'in:free,basic,pro'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
            'payment_intent_id' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $currentPlan = $profile->subscription_plan ?? 'free';
            $newPlan = $request->subscription_plan;

            if ($newPlan === $currentPlan) {
                return response()->json([
                    'success' => true,
                    'message' => 'No subscription changes were needed.',
                    'data' => [
                        'subscription_plan' => $profile->subscription_plan,
                        'billing_cycle' => $profile->billing_cycle,
                    ],
                ]);
            }

            $paidPlans = ['basic', 'pro'];

            if (in_array($newPlan, $paidPlans, true) && !$request->filled('payment_intent_id')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment is required to upgrade your plan. Please complete checkout first.',
                    'requires_payment' => true,
                ], 402);
            }

            if ($newPlan === 'free' && in_array($currentPlan, $paidPlans, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please contact support to cancel or downgrade your subscription.',
                ], 403);
            }

            if ($request->filled('payment_intent_id')) {
                $payment = app(\App\Services\Payments\StripeAcademyPaymentService::class)
                    ->syncPaymentIntent($request->string('payment_intent_id')->toString());

                if (!$payment->isPaid()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment has not been completed yet.',
                    ], 402);
                }

                if ($payment->user_id && $payment->user_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This payment belongs to another account.',
                    ], 403);
                }

                if (
                    !$payment->user_id
                    && $payment->customer_email
                    && strcasecmp($payment->customer_email, $user->email) !== 0
                ) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Please use the same email address you used for payment.',
                    ], 422);
                }

                if (!$payment->user_id) {
                    $payment->update([
                        'user_id' => $user->id,
                        'status' => 'consumed',
                    ]);
                }
            }

            $profile->subscription_plan = $newPlan;
            $profile->billing_cycle = $request->billing_cycle;
            $profile->save();

            return response()->json([
                'success' => true,
                'message' => 'Subscription updated successfully',
                'data' => [
                    'subscription_plan' => $profile->subscription_plan,
                    'billing_cycle' => $profile->billing_cycle
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update subscription: ' . $e->getMessage()
            ], 500);
        }
    }
}