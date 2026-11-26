<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\Admin;
use App\Models\ActivityLog;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    // Login
    public function login(Request $request)
    {
        // Rate limiting
        $key = 'admin-login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => "Too many login attempts. Please try again in {$seconds} seconds."
            ], 429);
        }

        // Validation
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            RateLimiter::hit($key, 300); // 5 minutes lockout
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Attempt authentication
        if (!Auth::guard('admin')->attempt($request->only('email', 'password'))) {
            RateLimiter::hit($key, 300);
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Get admin
        $admin = Auth::guard('admin')->user();
        
        // Check if admin is active
        if (!$admin->is_active) {
            Auth::guard('admin')->logout();
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated.'
            ], 403);
        }

        // Record login
        $admin->recordLogin($request->ip());
        
        // Create token
        $token = $admin->createToken('admin-token', ['admin'])->plainTextToken;
        
        // Log activity - USING STATIC METHOD
        ActivityLog::createActivity($admin, 'login', null, null, null, 'Admin logged in');

        // Clear rate limiter
        RateLimiter::clear($key);

        return response()->json([
            'success' => true,
            'data' => [
                'admin' => $admin,
                'token' => $token,
            ]
        ]);
    }

    // Logout
    public function logout(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        
        if ($admin) {
            // Log activity - USING STATIC METHOD
            ActivityLog::createActivity($admin, 'logout', null, null, null, 'Admin logged out');
            
            // Revoke current token
            $request->user('admin')->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Successfully logged out'
        ]);
    }

    // Get Admin Profile
    public function profile(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        
        return response()->json([
            'success' => true,
            'data' => $admin
        ]);
    }

    // Demo Login
    public function demoLogin(Request $request)
    {
        $demoAdmin = Admin::where('email', 'admin@example.com')->first();
        
        if (!$demoAdmin) {
            // Create demo admin if not exists
            $demoAdmin = Admin::create([
                'name' => 'Demo Admin',
                'email' => 'admin@example.com',
                'password' => Hash::make('admin123'),
                'role' => 'super_admin',
                'is_active' => true,
            ]);
        }

        // Record login
        $demoAdmin->recordLogin($request->ip());
        
        // Create token
        $token = $demoAdmin->createToken('admin-token', ['admin'])->plainTextToken;
        
        // Log activity - USING STATIC METHOD
        ActivityLog::createActivity($demoAdmin, 'login', null, null, null, 'Demo admin logged in');

        return response()->json([
            'success' => true,
            'data' => [
                'admin' => $demoAdmin,
                'token' => $token,
            ]
        ]);
    }
}