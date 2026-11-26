<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BadgeController;
use App\Http\Controllers\Api\CertificateController;
use App\Http\Controllers\Api\FreesbyTemplateController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SupportInquiryController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PUBLIC routes — explicitly strip ALL auth middleware
|--------------------------------------------------------------------------
*/
Route::withoutMiddleware(['auth', 'auth:sanctum'])->group(function () {
    // Auth
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/email/verify', [AuthController::class, 'verifyEmail']);

    // Support inquiries
    Route::post('/support-inquiries', [SupportInquiryController::class, 'store']);

    // Password reset
    Route::prefix('auth')->group(function () {
        Route::post('/forgot-password',               [PasswordResetController::class, 'forgotPassword']);
        Route::post('/validate-token',                [PasswordResetController::class, 'validateToken']);
        Route::post('/validate-token-comprehensive',  [PasswordResetController::class, 'validateTokenComprehensive']);
        Route::post('/reset-password',                [PasswordResetController::class, 'resetPassword']);
        Route::post('/check-password-strength',       [PasswordResetController::class, 'checkPasswordStrength']);
    });

    // Template downloads - Public endpoint
    Route::post('/template-download', [FreesbyTemplateController::class, 'store']);
    Route::get('/public/profile/{id}', [ProfileController::class, 'getPublicProfile']);

    require __DIR__ . '/api/platform-meetings-public.php';
    require __DIR__ . '/api/freesby-public.php';
    require __DIR__ . '/api/payment.php';
    require __DIR__ . '/api/media.php';
    require __DIR__ . '/api/training-agreements-public.php';
    require __DIR__ . '/api/free-invites-public.php';
    require __DIR__ . '/api/paid-invites-public.php';
    require __DIR__ . '/api/mobile-learner-public.php';
});

/*
|--------------------------------------------------------------------------
| PROTECTED routes — auth:sanctum required
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Broadcast::routes();

      // ============ COMMON ROUTES (All authenticated users) ============
    require __DIR__ . '/api/business-journal.php';

    // ============ PROFILE ROUTES ============
    require __DIR__ . '/api/profile.php';

    // ============ CERTIFICATE ROUTES ============
    Route::prefix('certificates')->group(function () {
        Route::get('/', [CertificateController::class, 'index']);
        Route::get('/download/{code}', [CertificateController::class, 'download']);
    });

    // ============ BADGE ROUTES ============
    Route::prefix('badges')->group(function () {
        Route::get('/', [BadgeController::class, 'index']);
        Route::get('/available', [BadgeController::class, 'available']);
        Route::get('/progress', [BadgeController::class, 'progress']);
    });


    require __DIR__ . '/api/user.php';
    require __DIR__ . '/api/learner.php';
    require __DIR__ . '/api/mobile-learner-auth.php';
    require __DIR__ . '/api/instructor.php';
    require __DIR__ . '/api/instructor/content.php';
    require __DIR__ . '/api/instructor/deal-marketplace.php';
    require __DIR__ . '/api/instructor/webinar.php';
    require __DIR__ . '/api/instructor/meeting.php';
    require __DIR__ . '/api/learner/content.php';
    require __DIR__ . '/api/learner/deal-marketplace.php';
    require __DIR__ . '/api/learner/contracts.php';
    require __DIR__ . '/api/learner/webinar.php';
    require __DIR__ . '/api/learner/meeting.php';
    require __DIR__ . '/api/learner/dashboard.php';
    require __DIR__ . '/api/learner/notifications.php';
    require __DIR__ . '/api/learner/reports.php';
    require __DIR__ . '/api/learner/announcements.php';
    require __DIR__ . '/api/chat.php';
    require __DIR__ . '/api/platform-meetings-auth.php';
    require __DIR__ . '/api/media-auth.php';
    require __DIR__ . '/api/microsoft.php';

    Route::middleware('admin')->prefix('admin')->group(function () {
        require __DIR__ . '/api/instructor/user.php';
        require __DIR__ . '/api/admin/users.php';
        require __DIR__ . '/api/admin/dashboard.php';
        require __DIR__ . '/api/admin/analytics.php';
        require __DIR__ . '/api/admin/google-analytics.php';
        require __DIR__ . '/api/admin/permissions.php';
        require __DIR__ . '/api/admin/crm.php';
        require __DIR__ . '/api/admin/platform-meetings.php';
        require __DIR__ . '/api/admin/subscriptions.php';
        require __DIR__ . '/api/admin/training-agreements.php';
        require __DIR__ . '/api/admin/free-invites.php';
        require __DIR__ . '/api/admin/paid-invites.php';
        require __DIR__ . '/api/admin/deal-marketplace.php';
        require __DIR__.'/api/admin/reports.php';

        // Support inquiries admin management
        Route::get('/support-inquiries', [SupportInquiryController::class, 'index']);
        Route::put('/support-inquiries/{id}', [SupportInquiryController::class, 'updateStatus']);
    });
});