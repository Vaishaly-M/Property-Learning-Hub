<?php

use App\Http\Controllers\Api\Learner\ProfileController as LearnerDashboardProfileController;
use App\Http\Controllers\Api\Learner\WeeklyReportController;
use App\Http\Controllers\Api\LearnerMyProfileController;
use App\Http\Controllers\Api\LearnerProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('profile')->group(function () {

    Route::get('/complete', [LearnerMyProfileController::class, 'getCompleteProfile']);
    Route::put('/', [LearnerMyProfileController::class, 'updateProfile']);
    Route::post('/picture', [LearnerMyProfileController::class, 'updateProfilePicture']);
    Route::post('/proof-of-address', [LearnerMyProfileController::class, 'uploadProofOfAddress']);
    Route::get('/proof-of-address', [LearnerMyProfileController::class, 'downloadProofOfAddress']);
    Route::delete('/proof-of-address', [LearnerMyProfileController::class, 'deleteProofOfAddress']);

    Route::get('/certificates', [LearnerMyProfileController::class, 'getCertificates']);
    Route::get('/activities', [LearnerMyProfileController::class, 'getActivities']);
    Route::get('/badges', [LearnerMyProfileController::class, 'getBadges']);
    Route::get('/payments', [LearnerMyProfileController::class, 'getPaymentHistory']);

    Route::put('/settings', [LearnerMyProfileController::class, 'updateSettings']);
    Route::put('/change-password', [LearnerMyProfileController::class, 'changePassword']);
    Route::put('/subscription', [LearnerMyProfileController::class, 'updateSubscription']);

    Route::get('/export', [LearnerMyProfileController::class, 'exportData']);
    Route::delete('/account', [LearnerMyProfileController::class, 'deleteAccount']);
});

Route::prefix('learner/profile')->group(function () {
    Route::get('/', [LearnerDashboardProfileController::class, 'show']);
    Route::put('/', [LearnerDashboardProfileController::class, 'update']);
    Route::post('/avatar', [LearnerDashboardProfileController::class, 'uploadAvatar']);
    Route::put('/password', [LearnerDashboardProfileController::class, 'changePassword']);
    Route::get('/learning-stats', [LearnerDashboardProfileController::class, 'learningStats']);
    Route::post('/complete', [LearnerProfileController::class, 'complete']);
});

