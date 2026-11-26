<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function getProfile(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Get user profile data
            $profileData = [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'name' => $user->first_name . ' ' . $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
                'profile_completed' => $user->isProfileCompleted(),
            ];
            
            // Add subscription data based on role
            if ($user->isLearner() && $user->learnerProfile) {
                $profileData['subscription'] = [
                    'level' => $user->learnerProfile->subscription_plan ?? 'free',
                    'billing_cycle' => $user->learnerProfile->billing_cycle ?? 'monthly',
                    'status' => $user->learnerProfile->subscription_status ?? 'active',
                ];
            } elseif ($user->isInstructor() && $user->instructorProfile) {
                $profileData['subscription'] = [
                    'level' => $user->instructorProfile->instructor_plan ?? 'free',
                    'billing_cycle' => $user->instructorProfile->billing_cycle ?? 'monthly',
                    'status' => $user->instructorProfile->status ?? 'active',
                ];
            } else {
                // Default subscription data
                $profileData['subscription'] = [
                    'level' => 'free',
                    'billing_cycle' => 'monthly',
                    'status' => 'active',
                ];
            }
            
            // Add any other dashboard-specific data here
            $profileData['stats'] = [
                'course_progress' => $user->course_progress ?? 0,
                'completed_courses' => $user->completed_courses ?? 0,
                'saved_deals' => $user->saved_deals ?? 0,
                'upcoming_webinars' => $user->upcoming_webinars ?? 0,
            ];
            
            return response()->json([
                'success' => true,
                'message' => 'Profile fetched successfully',
                'data' => $profileData
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function getDashboardData(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Add more dashboard data as needed
            $dashboardData = [
                'user' => [
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'subscription_level' => $user->isLearner() 
                        ? ($user->learnerProfile->subscription_plan ?? 'free')
                        : ($user->instructorProfile->instructor_plan ?? 'free'),
                    'role' => $user->role,
                ],
                // Add other dashboard sections data here
                'recent_activities' => [],
                'notifications' => [],
                'stats' => [
                    'course_progress' => 68, // Example static data
                    'meetings_booked' => 3,
                    'saved_deals' => 5,
                    'new_updates' => 12,
                ]
            ];
            
            return response()->json([
                'success' => true,
                'message' => 'Dashboard data fetched successfully',
                'data' => $dashboardData
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}