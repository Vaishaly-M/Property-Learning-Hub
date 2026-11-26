<?php

use App\Http\Controllers\Api\Mobile\MobileLearnerOnboardingController;
use Illuminate\Support\Facades\Route;

Route::prefix('mobile/learner')->group(function () {
    Route::get('/onboarding/info', [MobileLearnerOnboardingController::class, 'info']);
    Route::post('/onboarding/check-email', [MobileLearnerOnboardingController::class, 'checkEmail']);
    Route::post('/onboarding/check-phone', [MobileLearnerOnboardingController::class, 'checkPhone']);
    Route::post('/onboarding/sign-agreement', [MobileLearnerOnboardingController::class, 'signAgreement']);
    Route::post('/onboarding/register', [MobileLearnerOnboardingController::class, 'register']);
    Route::post('/onboarding/verify-email', [MobileLearnerOnboardingController::class, 'verifyEmail']);
    Route::post('/auth/login', [MobileLearnerOnboardingController::class, 'login']);
});
