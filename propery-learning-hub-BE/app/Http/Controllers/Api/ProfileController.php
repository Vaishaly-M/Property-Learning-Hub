<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    public function getPublicProfile($id): JsonResponse
    {
        // Find the user
        $user = User::with('learnerProfile')->find($id);
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found'
            ], 404);
        }

        $profile = $user->learnerProfile;

        // Calculate stats (replace with your actual logic)
        $stats = [
            'certificates' => 0,
            'courses' => 0,
            'hours' => 0,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'name' => trim($user->first_name . ' ' . $user->last_name),
                'bio' => $profile?->bio,
                'avatar' => $profile?->profile_photo_url,
                'joined' => $user->created_at->format('M Y'),
                'stats' => $stats,
                'interests' => $profile?->investment_interests ?? [],
            ]
        ]);
    }
}