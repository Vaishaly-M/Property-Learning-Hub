<?php

use App\Http\Controllers\Api\Mobile\MobileLearnerOnboardingController;
use App\Http\Controllers\Api\Mobile\MobileLearnerPaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('mobile/learner')->group(function () {
    Route::get('/me', [MobileLearnerOnboardingController::class, 'me']);
    Route::post('/auth/logout', [MobileLearnerOnboardingController::class, 'logout']);
    Route::post('/onboarding/resend-verification', [MobileLearnerOnboardingController::class, 'resendVerification']);

    Route::get('/payment/config', [MobileLearnerPaymentController::class, 'config']);
    Route::get('/payment/status', [MobileLearnerPaymentController::class, 'status']);
    Route::post('/payment/intent', [MobileLearnerPaymentController::class, 'createIntent']);
    Route::post('/payment/confirm', [MobileLearnerPaymentController::class, 'confirm']);
});
