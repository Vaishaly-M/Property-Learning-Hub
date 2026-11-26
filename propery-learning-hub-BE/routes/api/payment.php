<?php

use App\Http\Controllers\Api\AcademyPaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('payment')->group(function () {
    Route::get('/config', [AcademyPaymentController::class, 'config']);
    Route::post('/payment-intent', [AcademyPaymentController::class, 'createPaymentIntent']);
    Route::get('/verify', [AcademyPaymentController::class, 'verifyPayment']);
    Route::post('/register', [AcademyPaymentController::class, 'registerAfterPayment']);
    Route::post('/webhook', [AcademyPaymentController::class, 'webhook']);
});
