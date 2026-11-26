<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstructorProfile;
use Illuminate\Http\Request;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Validator;

class InstructorProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor profile only.'
            ], 403);
        }

        // Load profile with user data
        $profile = $user->load('instructorProfile')->instructorProfile;

        if (!$profile) {
            // Create empty profile if doesn't exist
            $profile = $user->instructorProfile()->create([
                'instructor_plan' => 'free',
                'billing_cycle' => 'monthly',
                'profile_completed' => false,
            ]);
        }

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
                ]
            ]
        ]);
    }

    public function update(Request $request)
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
            'professional_title' => ['sometimes', 'string', 'max:255'],
            'bio' => ['sometimes', 'string', 'max:2000'],
            'industry_experience' => ['sometimes', 'in:0-2,3-5,6-10,10+'],
            'primary_expertise' => ['sometimes', 'in:residential,commercial,reits,flipping,rentals,development,finance,law,tax,international'],
            'teaching_experience' => ['nullable', 'in:0-2,3-5,6-10,10+'],
            'course_output' => ['nullable', 'in:1-2,3-4,5-10,10+'],
            'qualifications' => ['sometimes', 'string', 'max:2000'],
            'languages' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'youtube_url' => ['nullable', 'url', 'max:255'],
            'portfolio_url' => ['nullable', 'url', 'max:255'],
            'instructor_plan' => ['sometimes', 'in:free,professional,enterprise'],
            'billing_cycle' => ['sometimes', 'in:monthly,yearly'],
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'profile_photo' => ['nullable', 'image', 'max:2048'],
            'display_expertise' => ['sometimes', 'string', 'max:255'],
            'teaching_specializations' => ['nullable', 'array'],
            'teaching_specializations.*' => ['string'],
            'course_formats' => ['nullable', 'array'],
            'course_formats.*' => ['string'],
        ], [
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
            'linkedin_url.url' => 'Please enter a valid LinkedIn URL',
            'linkedin_url.max' => 'LinkedIn URL cannot exceed 255 characters',
            'youtube_url.url' => 'Please enter a valid YouTube URL',
            'youtube_url.max' => 'YouTube URL cannot exceed 255 characters',
            'portfolio_url.url' => 'Please enter a valid portfolio URL',
            'portfolio_url.max' => 'Portfolio URL cannot exceed 255 characters',
            'instructor_plan.in' => 'Please select a valid instructor plan',
            'billing_cycle.in' => 'Please select a valid billing cycle',
            'country.string' => 'Country must be text',
            'country.max' => 'Country cannot exceed 255 characters',
            'city.string' => 'City must be text',
            'city.max' => 'City cannot exceed 255 characters',
            'profile_photo.image' => 'Profile photo must be an image file',
            'profile_photo.max' => 'Profile photo cannot exceed 2MB',
            'display_expertise.string' => 'Display expertise must be text',
            'display_expertise.max' => 'Display expertise cannot exceed 255 characters',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please fix the following errors:',
                'errors' => $validator->errors()
            ], 422);
        }

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

        // Update profile data
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

        // Handle array fields - store as JSON
        if ($request->has('teaching_specializations')) {
            $profile->teaching_specializations = $request->teaching_specializations;
        }
        
        if ($request->has('course_formats')) {
            $profile->course_formats = $request->course_formats;
        }

        // Fill and save profile
        $profile->fill($profileData);
        
        // If this is the first time saving required fields, mark as completed
        if (!$profile->profile_completed && 
            !empty($profile->professional_title) && 
            !empty($profile->bio) && 
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
    }

    public function complete(Request $request)
{
    $user = $request->user();
    
    if (!$user->isInstructor()) {
        return response()->json([
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

    // Treat empty strings as null so optional fields pass validation
    $nullableFields = [
        'teaching_experience', 'course_output', 'languages',
        'linkedin_url', 'youtube_url', 'portfolio_url',
        'country', 'city', 'billing_cycle',
    ];
    $merged = $request->all();
    foreach ($nullableFields as $field) {
        if (array_key_exists($field, $merged) && $merged[$field] === '') {
            $merged[$field] = null;
        }
    }

    // Normalize URLs without scheme (e.g. linkedin.com/in/user)
    foreach (['linkedin_url', 'youtube_url', 'portfolio_url'] as $urlField) {
        if (!empty($merged[$urlField]) && is_string($merged[$urlField])) {
            $url = trim($merged[$urlField]);
            if ($url && !preg_match('/^https?:\/\//i', $url)) {
                $merged[$urlField] = 'https://' . $url;
            }
        }
    }

    $request->merge($merged);

  $validator = Validator::make($request->all(), [
        'first_name' => ['required', 'string', 'max:255'],
        'last_name' => ['required', 'string', 'max:255'],
        'professional_title' => ['nullable', 'string', 'max:255'],
        'bio' => ['nullable', 'string', 'max:2000'],
        'industry_experience' => ['nullable', 'in:0-2,3-5,6-10,10+'],
        'primary_expertise' => ['nullable', 'in:residential,commercial,reits,flipping,rentals,development,finance,law,tax,international'],
        'qualifications' => ['nullable', 'string', 'max:2000'],
        'instructor_plan' => ['nullable', 'in:free,professional,enterprise'],
        
        // Make all other fields optional
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
        'teaching_specializations' => ['nullable', 'array'],
        'teaching_specializations.*' => ['string'],
        'course_formats' => ['nullable', 'array'],
        'course_formats.*' => ['string'],
    ], [
        // Custom error messages for required fields only
        'first_name.required' => 'First name is required',
        'first_name.string' => 'First name must be text',
        'first_name.max' => 'First name cannot exceed 255 characters',
        'last_name.required' => 'Last name is required',
        'last_name.string' => 'Last name must be text',
        'last_name.max' => 'Last name cannot exceed 255 characters',
        'professional_title.required' => 'Professional title is required',
        'professional_title.string' => 'Professional title must be text',
        'professional_title.max' => 'Professional title cannot exceed 255 characters',
        'bio.required' => 'Bio is required',
        'bio.string' => 'Bio must be text',
        'bio.max' => 'Bio cannot exceed 2000 characters',
        'industry_experience.required' => 'Industry experience is required',
        'industry_experience.in' => 'Please select a valid industry experience range',
        'primary_expertise.required' => 'Primary expertise is required',
        'primary_expertise.in' => 'Please select a valid area of expertise',
        'qualifications.required' => 'Qualifications are required',
        'qualifications.string' => 'Qualifications must be text',
        'qualifications.max' => 'Qualifications cannot exceed 2000 characters',
        'instructor_plan.required' => 'Instructor plan is required',
        'instructor_plan.in' => 'Please select a valid instructor plan',
      
        
        // Optional fields error messages
        'teaching_experience.in' => 'Please select a valid teaching experience range',
        'course_output.in' => 'Please select a valid course output range',
        'languages.string' => 'Languages must be text',
        'languages.max' => 'Languages cannot exceed 255 characters',
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
        'billing_cycle.in' => 'Please select a valid billing cycle',
        'profile_photo.image' => 'Profile photo must be an image file',
        'profile_photo.max' => 'Profile photo cannot exceed 2MB',
    ]);

    if ($validator->fails()) {
        $errors = $validator->errors();
        $fieldErrors = [];
        
        // Format errors for better frontend display
        foreach ($errors->messages() as $field => $messages) {
            $fieldErrors[$field] = $messages[0];
        }

        $firstError = collect($fieldErrors)->first();

        return response()->json([
            'message' => $firstError ?: 'Please fill in all required fields.',
            'errors' => $fieldErrors,
            'required_fields' => [
                'first_name',
                'last_name', 
                'professional_title',
                'bio',
                'industry_experience',
                'primary_expertise',
                'qualifications',
                'instructor_plan',
                
            ]
        ], 422);
    }

    // Update user
    $user->first_name = $request->first_name;
    $user->last_name = $request->last_name;
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

    // Update profile data with all fields (including optional ones)
    $profileData = [
        'professional_title' => $request->professional_title,
        'bio' => $request->bio,
        'industry_experience' => $request->industry_experience,
        'primary_expertise' => $request->primary_expertise,
        'qualifications' => $request->qualifications,
        'instructor_plan' => $request->instructor_plan ?? 'free',
       
        
        // Optional fields - only set if provided
        'teaching_experience' => $request->teaching_experience,
        'course_output' => $request->course_output,
        'languages' => $request->languages,
        'linkedin_url' => $request->linkedin_url,
        'youtube_url' => $request->youtube_url,
        'portfolio_url' => $request->portfolio_url,
        'country' => $request->country,
        'city' => $request->city,
        'billing_cycle' => $request->billing_cycle ?? 'monthly', // Default to monthly
    ];

    // Handle array fields
    if ($request->has('teaching_specializations')) {
        $profile->teaching_specializations = $request->teaching_specializations;
    }
    
    if ($request->has('course_formats')) {
        $profile->course_formats = $request->course_formats;
    }

    // Fill profile with all data
    $profile->fill($profileData);
    
    // Mark profile as completed
    $profile->profile_completed = true;
    $profile->profile_completed_at = now();
    
    $profile->save();

    return response()->json([
        'message' => 'Profile completed successfully! You can now access your instructor dashboard.',
        'redirect_to' => '/admin/dashboard',
        'profile' => $profile,
        'profile_photo_url' => $profile->profile_photo_url,
        'display_expertise' => $profile->display_expertise,
    ]);
}
}