<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstructorProfile;
use App\Models\User;
use Illuminate\Http\Request;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class InstructorMyProfileController extends Controller
{
    public function getCompleteProfile(Request $request)
    {
        $user = $request->user();

        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor only.'
            ], 403);
        }

        // Load or create instructor profile
        $profile = $user->instructorProfile ?? InstructorProfile::create([
            'user_id' => $user->id,
            'instructor_plan' => 'free',
            'billing_cycle' => 'monthly',
            'profile_completed' => false,
        ]);

        // Generate full profile photo URL
        $profilePhotoUrl = null;
        if ($profile->profile_photo_path) {
            $profilePhotoUrl = MediaUrl::url($profile->profile_photo_path);
        }

        // Ensure array fields are properly formatted
        $teachingSpecializations = $profile->teaching_specializations;
        if (is_string($teachingSpecializations)) {
            $teachingSpecializations = json_decode($teachingSpecializations, true) ?? [];
        }

        $courseFormats = $profile->course_formats;
        if (is_string($courseFormats)) {
            $courseFormats = json_decode($courseFormats, true) ?? [];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'full_name' => "{$user->first_name} {$user->last_name}",
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'avatar' => $profilePhotoUrl,
                    'avatar_initials' => strtoupper(
                        substr($user->first_name, 0, 1) .
                        substr($user->last_name, 0, 1)
                    ),
                    'join_date' => $user->created_at->format('Y-m-d'),
                    'role' => $user->role,
                ],

                'profile' => [
                    'professional_title' => $profile->professional_title,
                    'bio' => $profile->bio,
                    'industry_experience' => $profile->industry_experience,
                    'primary_expertise' => $profile->primary_expertise,
                    'teaching_experience' => $profile->teaching_experience,
                    'course_output' => $profile->course_output,
                    'qualifications' => $profile->qualifications,
                    'languages' => $profile->languages,
                    'linkedin_url' => $profile->linkedin_url,
                    'youtube_url' => $profile->youtube_url,
                    'portfolio_url' => $profile->portfolio_url,
                    'instructor_plan' => $profile->instructor_plan,
                    'billing_cycle' => $profile->billing_cycle,
                    'country' => $profile->country,
                    'city' => $profile->city,
                    'profile_photo_url' => $profilePhotoUrl,
                    'display_expertise' => $profile->display_expertise,
                    'teaching_specializations' => $teachingSpecializations,
                    'course_formats' => $courseFormats,
                    'profile_completed' => $profile->profile_completed,
                    'profile_completed_at' => $profile->profile_completed_at,
                ],

                'subscription' => [
                    'level' => $profile->instructor_plan ?? 'free',
                    'billing_cycle' => $profile->billing_cycle ?? 'monthly',
                    'status' => 'active',
                ],

                'stats' => [
                    'courses_created' => 0,
                    'students_enrolled' => 0,
                    'total_earnings' => 0,
                    'average_rating' => 0,
                    'total_reviews' => 0,
                    'active_courses' => 0,
                ],

                'courses' => [],
                'earnings' => [],
                'reviews' => [],
                'certifications' => [],
            ]
        ]);
    }

    // Calculate instructor stats
    private function calculateInstructorStats($user)
    {
        // Replace with actual database queries for instructor stats
        return [
            'courses_created' => 0,
            'students_enrolled' => 0,
            'total_earnings' => 0,
            'average_rating' => 0,
            'total_reviews' => 0,
            'active_courses' => 0,
        ];
    }

    // Get instructor courses
    private function getInstructorCourses($user)
    {
        // Replace with actual course model queries
        return [];
    }

    // Get instructor earnings
    private function getInstructorEarnings($user)
    {
        // Replace with actual earnings model queries
        return [];
    }

    // Get instructor reviews
    private function getInstructorReviews($user)
    {
        // Replace with actual review model queries
        return [];
    }

    // Get instructor certifications
    private function getInstructorCertifications($user)
    {
        // Default certifications based on profile completion
        $certifications = [];
        
        if ($user->instructorProfile && $user->instructorProfile->profile_completed) {
            $certifications[] = [
                'id' => '1',
                'title' => 'Verified Instructor',
                'description' => 'Completed instructor profile verification',
                'icon' => '✅',
                'issued_date' => $user->instructorProfile->profile_completed_at->format('Y-m-d'),
                'valid_until' => Carbon::parse($user->instructorProfile->profile_completed_at)->addYear()->format('Y-m-d'),
            ];
        }
        
        return $certifications;
    }

    // Update profile (for editing instructor info)
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        $profile = $user->instructorProfile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $this->sanitizeOptionalProfileFields($request);

        $validator = Validator::make($request->all(), [
            // User fields
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'phone_number' => ['sometimes', 'string', 'max:20'],
            
            // Professional info fields
            'professional_title' => ['sometimes', 'string', 'max:255'],
            'bio' => ['sometimes', 'string', 'max:2000'],
            'industry_experience' => ['sometimes', 'in:0-2,3-5,6-10,10+'],
            'primary_expertise' => ['sometimes', 'in:residential,commercial,reits,flipping,rentals,development,finance,law,tax,international'],
            'teaching_experience' => ['nullable', 'in:0-2,3-5,6-10,10+'],
            'course_output' => ['nullable', 'in:1-2,3-4,5-10,10+'],
            'qualifications' => ['sometimes', 'string', 'max:2000'],
            'languages' => ['nullable', 'string', 'max:255'],
            'display_expertise' => ['sometimes', 'string', 'max:255'],
            
            // Contact & Links
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'youtube_url' => ['nullable', 'url', 'max:255'],
            'portfolio_url' => ['nullable', 'url', 'max:255'],
            
            // Location
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            
            // Subscription
            'instructor_plan' => ['sometimes', 'in:free,professional,enterprise'],
            'billing_cycle' => ['sometimes', 'in:monthly,yearly'],
            
            // Array fields
            'teaching_specializations' => ['nullable', 'array'],
            'teaching_specializations.*' => ['string'],
            'course_formats' => ['nullable', 'array'],
            'course_formats.*' => ['string'],
        ], [
            'first_name.string' => 'First name must be text',
            'first_name.max' => 'First name cannot exceed 255 characters',
            'last_name.string' => 'Last name must be text',
            'last_name.max' => 'Last name cannot exceed 255 characters',
            'phone_number.string' => 'Phone number must be text',
            'phone_number.max' => 'Phone number cannot exceed 20 characters',
            'professional_title.string' => 'Professional title must be text',
            'professional_title.max' => 'Professional title cannot exceed 255 characters',
            'bio.string' => 'Bio must be text',
            'bio.max' => 'Bio cannot exceed 2000 characters',
            'industry_experience.in' => 'Please select a valid industry experience range',
            'primary_expertise.in' => 'Please select a valid area of expertise',
            'teaching_experience.in' => 'Please select a valid teaching experience range',
            'course_output.in' => 'Please select a valid course output range',
            'qualifications.string' => 'Qualifications must be text',
            'qualifications.max' => 'Qualifications cannot exceed 2000 characters',
            'languages.string' => 'Languages must be text',
            'languages.max' => 'Languages cannot exceed 255 characters',
            'display_expertise.string' => 'Display expertise must be text',
            'display_expertise.max' => 'Display expertise cannot exceed 255 characters',
            'linkedin_url.url' => 'Please enter a valid LinkedIn URL',
            'linkedin_url.max' => 'LinkedIn URL cannot exceed 255 characters',
            'youtube_url.url' => 'Please enter a valid YouTube URL',
            'youtube_url.max' => 'YouTube URL cannot exceed 255 characters',
            'portfolio_url.url' => 'Please enter a valid portfolio URL',
            'portfolio_url.max' => 'Portfolio URL cannot exceed 255 characters',
            'country.string' => 'Country must be text',
            'country.max' => 'Country cannot exceed 255 characters',
            'city.string' => 'City must be text',
            'city.max' => 'City cannot exceed 255 characters',
            'instructor_plan.in' => 'Please select a valid instructor plan',
            'billing_cycle.in' => 'Please select a valid billing cycle',
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
            if ($request->has('phone_number')) {
                $user->phone_number = $request->phone_number;
            }
            $user->save();

            // Update profile fields
            $profileData = $request->only([
                'professional_title',
                'bio',
                'industry_experience',
                'primary_expertise',
                'teaching_experience',
                'course_output',
                'qualifications',
                'languages',
                'linkedin_url',
                'youtube_url',
                'portfolio_url',
                'instructor_plan',
                'billing_cycle',
                'country',
                'city',
                'display_expertise',
            ]);

            // Handle array fields
            if ($request->has('teaching_specializations')) {
                $profile->teaching_specializations = $request->teaching_specializations;
            }
            
            if ($request->has('course_formats')) {
                $profile->course_formats = $request->course_formats;
            }

            $profile->fill($profileData);
            
            // Mark as completed if all required fields are filled
            if (!$profile->profile_completed && 
                !empty($profile->professional_title) && 
                !empty($profile->bio) && 
                !empty($profile->industry_experience) && 
                !empty($profile->primary_expertise) && 
                !empty($profile->qualifications)) {
                $profile->profile_completed = true;
                $profile->profile_completed_at = now();
            }
            
            $profile->save();

            // Generate profile photo URL for response
            $profilePhotoUrl = null;
            if ($profile->profile_photo_path) {
                $profilePhotoUrl = MediaUrl::url($profile->profile_photo_path);
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => [
                    'user' => [
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'full_name' => $user->first_name . ' ' . $user->last_name,
                        'email' => $user->email,
                        'phone_number' => $user->phone_number
                    ],
                    'profile' => [
                        'professional_title' => $profile->professional_title,
                        'bio' => $profile->bio,
                        'industry_experience' => $profile->industry_experience,
                        'primary_expertise' => $profile->primary_expertise,
                        'teaching_experience' => $profile->teaching_experience,
                        'course_output' => $profile->course_output,
                        'qualifications' => $profile->qualifications,
                        'languages' => $profile->languages,
                        'linkedin_url' => $profile->linkedin_url,
                        'youtube_url' => $profile->youtube_url,
                        'portfolio_url' => $profile->portfolio_url,
                        'instructor_plan' => $profile->instructor_plan,
                        'billing_cycle' => $profile->billing_cycle,
                        'country' => $profile->country,
                        'city' => $profile->city,
                        'profile_photo_url' => $profilePhotoUrl,
                        'display_expertise' => $profile->display_expertise,
                        'teaching_specializations' => $profile->teaching_specializations,
                        'course_formats' => $profile->course_formats,
                        'profile_completed' => $profile->profile_completed,
                        'profile_completed_at' => $profile->profile_completed_at,
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
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        $profile = $user->instructorProfile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'profile_photo' => 'required_without:profile_photo_path|image|max:2048',
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
                $path = MediaStorage::store($request->file('profile_photo'), 'profile-photos');
            }
            $profile->profile_photo_path = $path;
            $profile->save();

            $profilePhotoUrl = MediaUrl::url($path);

            return response()->json([
                'success' => true,
                'message' => 'Profile picture updated successfully',
                'data' => [
                    'profile_photo_url' => $profilePhotoUrl
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile picture: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get instructor courses
    public function getCourses(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        // Replace with actual course model queries
        $courses = [];

        return response()->json([
            'success' => true,
            'data' => $courses
        ]);
    }

    // Get instructor earnings
    public function getEarnings(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        // Replace with actual earnings model queries
        $earnings = [];

        return response()->json([
            'success' => true,
            'data' => $earnings
        ]);
    }

    // Get instructor reviews
    public function getReviews(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        // Replace with actual review model queries
        $reviews = [];

        return response()->json([
            'success' => true,
            'data' => $reviews
        ]);
    }

    // Get instructor certifications
    public function getCertifications(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        $certifications = $this->getInstructorCertifications($user);

        return response()->json([
            'success' => true,
            'data' => $certifications
        ]);
    }

    // Update settings
    public function updateSettings(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'email_notifications' => ['sometimes', 'boolean'],
            'course_update_notifications' => ['sometimes', 'boolean'],
            'student_message_notifications' => ['sometimes', 'boolean'],
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
            // Update instructor settings
            $profile = $user->instructorProfile;
            if ($profile) {
                $settings = $profile->settings ?? [];
                $settings = array_merge($settings, $request->only([
                    'email_notifications',
                    'course_update_notifications',
                    'student_message_notifications',
                    'theme',
                    'language'
                ]));
                $profile->settings = $settings;
                $profile->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    // Change password (shared method, can be reused from AuthController)
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
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 400);
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

    // Get payment history (for instructor earnings)
    public function getPaymentHistory(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        // Replace with actual payment/earnings model queries
        $payments = [];

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    // Export data
    public function exportData(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
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

        // Verify password
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password'
            ], 400);
        }

        try {
            // Soft delete the user
            $user->delete();

            // Logout user
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

    // Update subscription/plan
    public function updateSubscription(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        $profile = $user->instructorProfile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'instructor_plan' => ['required', 'in:free,professional,enterprise'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $profile->instructor_plan = $request->instructor_plan;
            $profile->billing_cycle = $request->billing_cycle;
            $profile->save();

            return response()->json([
                'success' => true,
                'message' => 'Subscription updated successfully',
                'data' => [
                    'instructor_plan' => $profile->instructor_plan,
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

    // Complete profile setup (for initial setup)
    public function completeProfile(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        $profile = $user->instructorProfile;

        if (!$profile) {
            $profile = $user->instructorProfile()->create([
                'instructor_plan' => 'free',
                'billing_cycle' => 'monthly',
                'profile_completed' => false,
            ]);
        }

        $this->sanitizeOptionalProfileFields($request);

        $validator = Validator::make($request->all(), [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'professional_title' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'industry_experience' => ['nullable', 'in:0-2,3-5,6-10,10+'],
            'primary_expertise' => ['nullable', 'in:residential,commercial,reits,flipping,rentals,development,finance,law,tax,international'],
            'qualifications' => ['nullable', 'string', 'max:2000'],
            'instructor_plan' => ['nullable', 'in:free,professional,enterprise'],
            
            // Optional fields
            'phone_number' => ['sometimes', 'string', 'max:20'],
            'teaching_experience' => ['nullable', 'in:0-2,3-5,6-10,10+'],
            'course_output' => ['nullable', 'in:1-2,3-4,5-10,10+'],
            'languages' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'youtube_url' => ['nullable', 'url', 'max:255'],
            'portfolio_url' => ['nullable', 'url', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'billing_cycle' => ['nullable', 'in:monthly,yearly'],
            'profile_photo' => ['nullable', 'image', 'max:2048'],
            'display_expertise' => ['sometimes', 'string', 'max:255'],
            'teaching_specializations' => ['nullable', 'array'],
            'teaching_specializations.*' => ['string'],
            'course_formats' => ['nullable', 'array'],
            'course_formats.*' => ['string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please fill in all required fields',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Update user
            $user->first_name = $request->first_name;
            $user->last_name = $request->last_name;
            if ($request->has('phone_number')) {
                $user->phone_number = $request->phone_number;
            }
            $user->save();

            // Handle profile photo upload
            if ($request->filled('profile_photo_path')) {
                $path = DirectUpload::resolvePath($request, 'profile_photo_path');
                if ($path instanceof \Illuminate\Http\JsonResponse) {
                    return $path;
                }
                if ($profile->profile_photo_path) {
                    MediaStorage::delete($profile->profile_photo_path);
                }
                $profile->profile_photo_path = $path;
            } elseif ($request->hasFile('profile_photo')) {
                if ($profile->profile_photo_path) {
                    MediaStorage::delete($profile->profile_photo_path);
                }

                $path = MediaStorage::store($request->file('profile_photo'), 'profile-photos');
                $profile->profile_photo_path = $path;
            }

            // Update profile with all data
            $profileData = $request->only([
                'professional_title',
                'bio',
                'industry_experience',
                'primary_expertise',
                'teaching_experience',
                'course_output',
                'qualifications',
                'languages',
                'linkedin_url',
                'youtube_url',
                'portfolio_url',
                'instructor_plan',
                'billing_cycle',
                'country',
                'city',
                'display_expertise',
            ]);

            // Handle array fields
            if ($request->has('teaching_specializations')) {
                $profile->teaching_specializations = $request->teaching_specializations;
            }
            
            if ($request->has('course_formats')) {
                $profile->course_formats = $request->course_formats;
            }

            $profile->fill($profileData);
            $profile->profile_completed = true;
            $profile->profile_completed_at = now();
            $profile->save();

            $profilePhotoUrl = null;
            if ($profile->profile_photo_path) {
                $profilePhotoUrl = MediaUrl::url($profile->profile_photo_path);
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile completed successfully!',
                'redirect_to' => '/admin/dashboard',
                'data' => [
                    'user' => [
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'full_name' => $user->first_name . ' ' . $user->last_name,
                        'email' => $user->email,
                        'phone_number' => $user->phone_number,
                        'profile_completed' => true,
                    ],
                    'profile' => [
                        'professional_title' => $profile->professional_title,
                        'profile_completed' => true,
                        'profile_completed_at' => $profile->profile_completed_at,
                        'profile_photo_url' => $profilePhotoUrl,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete profile: ' . $e->getMessage()
            ], 500);
        }
    }

    private function sanitizeOptionalProfileFields(Request $request): void
    {
        $nullableFields = [
            'teaching_experience', 'course_output', 'languages',
            'linkedin_url', 'youtube_url', 'portfolio_url',
            'country', 'city', 'billing_cycle', 'phone_number',
        ];
        $merged = $request->all();
        foreach ($nullableFields as $field) {
            if (array_key_exists($field, $merged) && $merged[$field] === '') {
                $merged[$field] = null;
            }
        }
        $request->merge($merged);
    }
}