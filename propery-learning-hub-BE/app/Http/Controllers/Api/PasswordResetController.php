<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\User;
use App\Mail\PasswordResetMail;
use Illuminate\Support\Facades\Mail;

class PasswordResetController extends Controller
{
    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        // First, validate the email
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email'
        ], [
            'email.exists' => 'We could not find a user with that email address.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first()
            ], 422);
        }

        try {
            // Generate token
            $token = Str::random(64);
            
            // Store token in database
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $request->email],
                [
                    'token' => Hash::make($token),
                    'created_at' => Carbon::now()
                ]
            );

            // Generate reset URL
            $resetUrl = config('app.frontend_url', 'http://localhost:3000') . 
                       '/reset-password?token=' . $token . '&email=' . urlencode($request->email);

            // Send email
            Mail::to($request->email)->send(new PasswordResetMail($token, $request->email));

            return response()->json([
                'status' => 'success',
                'message' => 'Password reset link sent to your email.',
                'data' => [
                    'reset_url' => $resetUrl // For development/testing
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Forgot Password Error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to send reset link. Please try again later.'
            ], 500);
        }
    }

    /**
     * Validate password reset token
     */
    public function validateToken(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email|exists:users,email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid token or email.'
            ]);
        }

        try {
            $resetData = DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->first();

            if (!$resetData) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Reset token not found or has expired.'
                ]);
            }

            // Check if token is expired (1 hour)
            $createdAt = Carbon::parse($resetData->created_at);
            if ($createdAt->addHours(1)->isPast()) {
                // Clean up expired token
                DB::table('password_reset_tokens')
                    ->where('email', $request->email)
                    ->delete();
                    
                return response()->json([
                    'valid' => false,
                    'message' => 'Reset token has expired. Please request a new one.'
                ]);
            }

            // Verify token
            if (!Hash::check($request->token, $resetData->token)) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Invalid reset token.'
                ]);
            }

            return response()->json([
                'valid' => true,
                'message' => 'Token is valid.'
            ]);

        } catch (\Exception $e) {
            \Log::error('Token Validation Error: ' . $e->getMessage());
            
            return response()->json([
                'valid' => false,
                'message' => 'Unable to validate token. Please try again.'
            ]);
        }
    }

    /**
     * Comprehensive token validation with additional checks
     */
    public function validateTokenComprehensive(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email|exists:users,email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid request parameters.'
            ]);
        }

        try {
            $resetData = DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->first();

            // Check if token exists
            if (!$resetData) {
                return response()->json([
                    'valid' => false,
                    'message' => 'No password reset request found for this email.',
                    'code' => 'TOKEN_NOT_FOUND'
                ]);
            }

            // Check token age (1 hour expiry)
            $createdAt = Carbon::parse($resetData->created_at);
            $expiresAt = $createdAt->addHours(1);
            
            if ($expiresAt->isPast()) {
                // Clean up expired token
                DB::table('password_reset_tokens')
                    ->where('email', $request->email)
                    ->delete();
                    
                return response()->json([
                    'valid' => false,
                    'message' => 'This password reset link has expired. Please request a new one.',
                    'code' => 'TOKEN_EXPIRED',
                    'expired_at' => $expiresAt->toIso8601String()
                ]);
            }

            // Verify token hash
            if (!Hash::check($request->token, $resetData->token)) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Invalid or corrupted reset link.',
                    'code' => 'INVALID_TOKEN'
                ]);
            }

            // Check if user still exists and is active
            $user = User::where('email', $request->email)->first();
            if (!$user) {
                DB::table('password_reset_tokens')
                    ->where('email', $request->email)
                    ->delete();
                    
                return response()->json([
                    'valid' => false,
                    'message' => 'User account not found.',
                    'code' => 'USER_NOT_FOUND'
                ]);
            }

            return response()->json([
                'valid' => true,
                'message' => 'Reset link is valid.',
                'data' => [
                    'email' => $user->email,
                    'expires_at' => $expiresAt->toIso8601String(),
                    'expires_in_minutes' => Carbon::now()->diffInMinutes($expiresAt, false)
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Comprehensive Token Validation Error: ' . $e->getMessage());
            
            return response()->json([
                'valid' => false,
                'message' => 'Unable to validate reset link.',
                'code' => 'VALIDATION_ERROR'
            ]);
        }
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email|exists:users,email',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/'
            ]
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Get reset token data
            $resetData = DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->first();

            if (!$resetData) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid or expired reset token.'
                ], 400);
            }

            // Verify token
            if (!Hash::check($request->token, $resetData->token)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid reset token.'
                ], 400);
            }

            // Check if token is expired (1 hour)
            $createdAt = Carbon::parse($resetData->created_at);
            if ($createdAt->addHours(1)->isPast()) {
                // Clean up expired token
                DB::table('password_reset_tokens')
                    ->where('email', $request->email)
                    ->delete();
                    
                return response()->json([
                    'status' => 'error',
                    'message' => 'Reset token has expired.'
                ], 400);
            }

            // Get user
            $user = User::where('email', $request->email)->first();
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found.'
                ], 404);
            }

            // Check if new password is same as old password (optional security measure)
            if (Hash::check($request->password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'New password cannot be the same as your current password.'
                ], 422);
            }

            // Update password
            $user->password = Hash::make($request->password);
            $user->save();

            // Delete used token
            DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->delete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Password has been reset successfully. You can now login with your new password.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Password Reset Error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reset password. Please try again.'
            ], 500);
        }
    }

    /**
     * Check password strength (optional endpoint)
     */
    public function checkPasswordStrength(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'valid' => false,
                'message' => 'Password is required'
            ]);
        }

        $password = $request->password;
        
        $strength = [
            'hasMinLength' => strlen($password) >= 8,
            'hasUpperCase' => preg_match('/[A-Z]/', $password),
            'hasLowerCase' => preg_match('/[a-z]/', $password),
            'hasNumber' => preg_match('/\d/', $password),
            'hasSpecialChar' => preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)
        ];

        $score = array_sum($strength);
        $total = count($strength);
        $percentage = ($score / $total) * 100;

        $strengthLevel = 'Weak';
        if ($percentage >= 80) {
            $strengthLevel = 'Strong';
        } elseif ($percentage >= 60) {
            $strengthLevel = 'Good';
        } elseif ($percentage >= 40) {
            $strengthLevel = 'Fair';
        }

        return response()->json([
            'valid' => $score === $total,
            'strength' => $strengthLevel,
            'score' => $score . '/' . $total,
            'percentage' => round($percentage),
            'requirements' => $strength
        ]);
    }
}