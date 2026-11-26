<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LearnerMyProfileController;

Route::post('/logout',            [AuthController::class, 'logout']);
Route::get('/user',               [AuthController::class, 'user']);
Route::get('/user/profile-info',  [AuthController::class, 'getUserProfileSetupInfo']);
Route::put('/user/profile',       [AuthController::class, 'updateUserProfile']);
Route::put('/user/change-password', [AuthController::class, 'changeUserPassword']);
Route::post('/email/verification-notification', [AuthController::class, 'resendVerificationEmail']);

Route::get('/profile/complete',        [LearnerMyProfileController::class, 'getCompleteProfile']);
Route::put('/profile',                 [LearnerMyProfileController::class, 'updateProfile']);
Route::post('/profile/picture',        [LearnerMyProfileController::class, 'updateProfilePicture']);
Route::post('/profile/proof-of-address', [LearnerMyProfileController::class, 'uploadProofOfAddress']);
Route::get('/profile/proof-of-address', [LearnerMyProfileController::class, 'downloadProofOfAddress']);
Route::delete('/profile/proof-of-address', [LearnerMyProfileController::class, 'deleteProofOfAddress']);
Route::get('/profile/certificates',    [LearnerMyProfileController::class, 'getCertificates']);
Route::get('/profile/activities',      [LearnerMyProfileController::class, 'getActivities']);
Route::get('/profile/badges',          [LearnerMyProfileController::class, 'getBadges']);
Route::put('/profile/settings',        [LearnerMyProfileController::class, 'updateSettings']);
Route::put('/profile/change-password', [LearnerMyProfileController::class, 'changePassword']);
Route::get('/profile/payments',        [LearnerMyProfileController::class, 'getPaymentHistory']);
Route::get('/profile/export',          [LearnerMyProfileController::class, 'exportData']);
Route::put('/profile/subscription',    [LearnerMyProfileController::class, 'updateSubscription']);
Route::delete('/profile/account',      [LearnerMyProfileController::class, 'deleteAccount']);