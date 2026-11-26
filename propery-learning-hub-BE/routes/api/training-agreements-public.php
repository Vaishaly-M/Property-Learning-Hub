<?php

use App\Http\Controllers\Api\TrainingAgreementController;
use Illuminate\Support\Facades\Route;

Route::prefix('training-agreements')->group(function () {
    Route::get('/config', [TrainingAgreementController::class, 'config']);
    Route::post('/check-email', [TrainingAgreementController::class, 'checkEmail']);
    Route::post('/check-phone', [TrainingAgreementController::class, 'checkPhone']);
    Route::post('/client-sign', [TrainingAgreementController::class, 'clientSign']);
    Route::get('/by-token/{token}', [TrainingAgreementController::class, 'showByToken']);
});
