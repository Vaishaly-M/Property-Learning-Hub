<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Learner\DashboardController as LearnerDashboardController;
use App\Http\Controllers\Api\Learner\InfinitWizardController;

// ============================================================
// LEARNER DASHBOARD ROUTES
// ============================================================
Route::prefix('learner/dashboard')->group(function () {

    // Dashboard main data
    Route::get('/', [LearnerDashboardController::class, 'index']);

    // Dashboard stats
    Route::get('/stats', [LearnerDashboardController::class, 'stats']);

    // Recent activity / notifications feed
    Route::get('/activity', [LearnerDashboardController::class, 'activity']);
});

// InfinitWizard SSO (create account + VIP + auto-login redirect)
Route::post('learner/infinitwizard/sso', [InfinitWizardController::class, 'sso']);
