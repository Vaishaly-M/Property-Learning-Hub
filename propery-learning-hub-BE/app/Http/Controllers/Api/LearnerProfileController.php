<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearnerProfile;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LearnerProfileController extends Controller
{
    public function show(Request $request)
        {
            return response()->json([
                'success' => true,
                'data' => [
                    'profile' => $request->user()->learnerProfile
                ]
            ]);
        }


    public function update(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isLearner()) {
            return response()->json([
                'message' => 'Access denied. Learner profile only.'
            ], 403);
        }

        $profile = $user->learnerProfile;

        if (!$profile) {
            return response()->json([
                'message' => 'Profile not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'date_of_birth' => ['sometimes', 'date'],
            'gender' => ['sometimes', 'in:male,female,other,prefer-not-to-say'],
            'bio' => ['sometimes', 'string', 'max:2000'],
            'job_title' => ['sometimes', 'string', 'max:255'],
            'company' => ['sometimes', 'string', 'max:255'],
            'years_of_experience' => ['sometimes', 'in:beginner,intermediate,advanced,expert'],
            'investment_budget' => ['sometimes', 'in:under-50k,50k-200k,200k-500k,500k-1m,over-1m'],
            'country' => ['sometimes', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:255'],
            'alternate_phone' => ['sometimes', 'string', 'max:20'],
            'linkedin_url' => ['sometimes', 'url', 'max:255'],
            'subscription_plan' => ['sometimes', 'in:free,basic,pro'],
            'billing_cycle' => ['sometimes', 'in:monthly,yearly'],
            'profile_photo' => ['sometimes', 'image', 'max:2048'], // 2MB max
            'investment_interests' => ['sometimes', 'array'],
            'investment_interests.*' => ['string'],
            'learning_preferences' => ['sometimes', 'array'],
            'learning_preferences.*' => ['string'],
        ], [
            // Custom error messages for better clarity
            'first_name.string' => 'First name must be text',
            'first_name.max' => 'First name cannot exceed 255 characters',
            'last_name.string' => 'Last name must be text',
            'last_name.max' => 'Last name cannot exceed 255 characters',
            'date_of_birth.date' => 'Please enter a valid date of birth',
            'gender.in' => 'Please select a valid gender option',
            'bio.string' => 'Bio must be text',
            'bio.max' => 'Bio cannot exceed 2000 characters',
            'job_title.string' => 'Job title must be text',
            'job_title.max' => 'Job title cannot exceed 255 characters',
            'company.string' => 'Company name must be text',
            'company.max' => 'Company name cannot exceed 255 characters',
            'years_of_experience.in' => 'Please select a valid experience level',
            'investment_budget.in' => 'Please select a valid investment budget range',
            'country.string' => 'Country must be text',
            'country.max' => 'Country cannot exceed 255 characters',
            'city.string' => 'City must be text',
            'city.max' => 'City cannot exceed 255 characters',
            'alternate_phone.string' => 'Alternate phone must be text',
            'alternate_phone.max' => 'Alternate phone cannot exceed 20 characters',
            'linkedin_url.url' => 'Please enter a valid LinkedIn URL',
            'linkedin_url.max' => 'LinkedIn URL cannot exceed 255 characters',
            'subscription_plan.in' => 'Please select a valid subscription plan',
            'billing_cycle.in' => 'Please select a valid billing cycle',
            'profile_photo.image' => 'Profile photo must be an image file',
            'profile_photo.max' => 'Profile photo cannot exceed 2MB',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Please check the following fields:',
                'errors' => $validator->errors()
            ], 422);
        }

        // Update user information if provided
        if ($request->has('first_name')) {
            $user->first_name = $request->first_name;
        }
        if ($request->has('last_name')) {
            $user->last_name = $request->last_name;
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

        // Update profile data - only update fields that are provided
        $profileData = [];
        $fields = [
            'date_of_birth',
            'gender',
            'bio',
            'job_title',
            'company',
            'years_of_experience',
            'investment_budget',
            'country',
            'city',
            'alternate_phone',
            'linkedin_url',
            'subscription_plan',
            'billing_cycle',
        ];

        foreach ($fields as $field) {
            if ($request->has($field) && !is_null($request->$field)) {
                $profileData[$field] = $request->$field;
            }
        }

        // Handle array fields
        if ($request->has('investment_interests')) {
            $profile->investment_interests = $request->investment_interests;
        }
        
        if ($request->has('learning_preferences')) {
            $profile->learning_preferences = $request->learning_preferences;
        }

        // Only fill if there's data to update
        if (!empty($profileData)) {
            $profile->fill($profileData);
        }
        
        $profile->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile,
            'profile_photo_url' => $profile->profile_photo_url,
        ]);
    }

    public function complete(Request $request)
    {
        $user = $request->user();

        if (!$user->isLearner()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Treat empty strings as null so optional fields pass validation
        $nullableFields = [
            'date_of_birth',
            'gender',
            'bio',
            'job_title',
            'company',
            'years_of_experience',
            'investment_budget',
            'country',
            'city',
            'alternate_phone',
            'linkedin_url',
            'subscription_plan',
            'billing_cycle',
        ];
        $merged = $request->all();
        foreach ($nullableFields as $field) {
            if (array_key_exists($field, $merged) && $merged[$field] === '') {
                $merged[$field] = null;
            }
        }

        if (!empty($merged['linkedin_url']) && is_string($merged['linkedin_url'])) {
            $url = trim($merged['linkedin_url']);
            if ($url && !preg_match('/^https?:\/\//i', $url)) {
                $merged['linkedin_url'] = 'https://' . $url;
            }
        }

        $request->merge($merged);

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other,prefer-not-to-say',
            'bio' => 'nullable|string|max:2000',
            'job_title' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'years_of_experience' => 'nullable|in:beginner,intermediate,advanced,expert',
            'investment_budget' => 'nullable|in:under-50k,50k-200k,200k-500k,500k-1m,over-1m',
            'country' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'alternate_phone' => 'nullable|string|max:20',
            'linkedin_url' => 'nullable|url|max:255',
            'subscription_plan' => 'nullable|in:free,basic,pro',
            'billing_cycle' => 'nullable|in:monthly,yearly',
            'profile_photo' => 'nullable|image|max:2048',
            'investment_interests' => 'nullable|array',
            'learning_preferences' => 'nullable|array',
        ]);

        // ✅ Update USER
        $user->update([
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
        ]);

        // ✅ Update PROFILE
        $profile = $user->learnerProfile;

        if (!$profile) {
            $profile = LearnerProfile::create([
                'user_id' => $user->id,
                'profile_completed' => false,
            ]);
        }

        $profile->fill($request->only([
            'date_of_birth',
            'gender',
            'bio',
            'job_title',
            'company',
            'years_of_experience',
            'investment_budget',
            'country',
            'city',
            'alternate_phone',
            'linkedin_url',
            'subscription_plan',
            'billing_cycle',
            'investment_interests',
            'learning_preferences',
        ]));

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
            $profile->profile_photo_path = MediaStorage::store(
                $request->file('profile_photo'),
                'profile-photos'
            );
        }

        $profile->profile_completed = true;
        $profile->profile_completed_at = now();
        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile completed successfully',
            'data' => [
                'profile' => $profile
            ]
        ]);
    }
}