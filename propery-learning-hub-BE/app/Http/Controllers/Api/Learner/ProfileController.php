<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\CourseEnrollment;
use App\Models\LearnerProfile;
use App\Models\LessonProgress;
use App\Models\MeetingRegistration;
use App\Models\WebinarRegistration;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    /**
     * GET /api/learner/profile
     *
     * Returns the authenticated learner's profile along with learning stats.
     */
    public function show(): JsonResponse
    {
        $user = Auth::user()->load('learnerProfile');

        return response()->json([
            'success' => true,
            'data'    => $this->transformUser($user),
        ]);
    }

    /**
     * PUT /api/learner/profile
     *
     * Update basic profile fields (name, bio, phone, timezone, etc.).
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:100',
            'last_name'  => 'sometimes|string|max:100',
            'phone'      => 'nullable|string|max:30',
            'bio'        => 'nullable|string|max:1000',
            'timezone'   => 'nullable|string|max:60',
            'website'    => 'nullable|url|max:255',
            'linkedin'   => 'nullable|url|max:255',
            'settings'   => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $fillable = ['first_name', 'last_name', 'phone', 'bio', 'timezone', 'website', 'linkedin'];
        $data     = $request->only($fillable);

        // Recompute `name` convenience field if first/last changed
        if (isset($data['first_name']) || isset($data['last_name'])) {
            $data['name'] = trim(
                ($data['first_name'] ?? $user->first_name) . ' ' .
                ($data['last_name']  ?? $user->last_name)
            );
        }

        $user->update($data);

        $profile = $user->learnerProfile ?? LearnerProfile::create([
            'user_id' => $user->id,
            'profile_completed' => false,
        ]);

        if ($request->has('settings')) {
            $profile->update(['settings' => $request->input('settings')]);
        }
        if ($request->has('bio')) {
            $profile->update(['bio' => $request->input('bio')]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data'    => $this->transformUser($user->fresh()),
        ]);
    }

    /**
     * POST /api/learner/profile/avatar
     *
     * Upload or replace the profile photo.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'avatar' => 'required_without:avatar_path|image|mimes:jpg,jpeg,png,webp|max:2048',
            'avatar_path' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $profile = $user->learnerProfile ?? LearnerProfile::create([
            'user_id' => $user->id,
            'profile_completed' => false,
        ]);

        if ($profile->profile_photo_path && MediaStorage::exists($profile->profile_photo_path)) {
            MediaStorage::delete($profile->profile_photo_path);
        }

        if ($request->filled('avatar_path')) {
            $path = DirectUpload::resolvePath($request, 'avatar_path');
            if ($path instanceof JsonResponse) {
                return $path;
            }
        } else {
            $path = MediaStorage::store($request->file('avatar'), 'profile-photos');
        }
        $profile->update(['profile_photo_path' => $path]);

        return response()->json([
            'success'   => true,
            'message'   => 'Avatar uploaded successfully',
            'avatarUrl' => $profile->fresh()->profile_photo_url,
        ]);
    }

    /**
     * PUT /api/learner/profile/password
     *
     * Change password with current-password confirmation.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    /**
     * GET /api/learner/profile/learning-stats
     *
     * Detailed learning statistics for the profile page.
     */
    public function learningStats(): JsonResponse
    {
        $userId = Auth::id();

        $enrollments = CourseEnrollment::where('user_id', $userId)->get();

        $totalCourses    = $enrollments->count();
        $completedCourses = $enrollments->where('status', 'completed')->count();
        $inProgressCourses = $enrollments->where('status', 'in_progress')->count();

        $totalLessonsCompleted = LessonProgress::where('user_id', $userId)
            ->where('is_completed', true)
            ->count();

        $totalWatchSeconds = LessonProgress::where('user_id', $userId)->sum('watch_time');
        $totalWatchHours   = round($totalWatchSeconds / 3600, 1);

        $webinarsAttended = WebinarRegistration::where('learner_id', $userId)
            ->where('status', 'attended')
            ->count();

        $meetingsAttended = MeetingRegistration::where('learner_id', $userId)
            ->where('status', 'attended')
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'totalCourses'         => $totalCourses,
                'completedCourses'     => $completedCourses,
                'inProgressCourses'    => $inProgressCourses,
                'totalLessonsCompleted'=> $totalLessonsCompleted,
                'totalWatchHours'      => $totalWatchHours,
                'webinarsAttended'     => $webinarsAttended,
                'meetingsAttended'     => $meetingsAttended,
                'streakDays'           => $this->calculateStreak($userId),
            ],
        ]);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function transformUser($user): array
    {
        $profile = $user->relationLoaded('learnerProfile')
            ? $user->learnerProfile
            : $user->learnerProfile()->first();

        $avatarUrl = $profile?->profile_photo_url;

        $roleMap = [
            'learner'    => 'Premium Member',
            'student'    => 'Premium Member',
            'user'       => 'Premium Member',
            'instructor' => 'Instructor',
            'admin'      => 'Administrator',
        ];

        return [
            'id'        => $user->id,
            'firstName' => $user->first_name ?? explode(' ', $user->name ?? '')[0] ?? '',
            'lastName'  => $user->last_name  ?? (explode(' ', $user->name ?? '') [1] ?? ''),
            'name'      => $user->name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
            'email'     => $user->email,
            'phone'     => $user->phone_number,
            'bio'       => $profile?->bio,
            'timezone'  => $user->timezone,
            'website'   => $user->website,
            'linkedin'  => $user->linkedin,
            'role'      => $roleMap[$user->role ?? 'learner'] ?? 'Premium Member',
            'rawRole'   => $user->role ?? 'learner',
            'avatarUrl' => $avatarUrl,
            'settings'  => $profile?->resolvedSettings() ?? ['email_notifications' => true, 'theme' => 'light', 'language' => 'English'],
            'joinedAt'  => $user->created_at?->toISOString(),
        ];
    }

    /**
     * Simple streak calculation: consecutive days with at least one completed lesson.
     */
    private function calculateStreak(int $userId): int
    {
        $dates = LessonProgress::where('user_id', $userId)
            ->where('is_completed', true)
            ->whereNotNull('completed_at')
            ->orderByDesc('completed_at')
            ->pluck('completed_at')
            ->map(fn ($d) => \Carbon\Carbon::parse($d)->toDateString())
            ->unique()
            ->values();

        if ($dates->isEmpty()) return 0;

        $streak  = 0;
        $current = now()->toDateString();

        foreach ($dates as $date) {
            if ($date === $current || $date === now()->subDays($streak)->toDateString()) {
                $streak++;
            } else {
                break;
            }
        }

        return $streak;
    }
}