<?php

use App\Http\Controllers\Api\TrainingAgreementController;
use Illuminate\Support\Facades\Route;

Route::prefix('training-agreements')->group(function () {
    Route::get('/', [TrainingAgreementController::class, 'adminIndex']);
    Route::get('/{trainingAgreement}', [TrainingAgreementController::class, 'adminShow']);
    Route::post('/{trainingAgreement}/complete', [TrainingAgreementController::class, 'adminComplete']);
    Route::post('/{trainingAgreement}/auto-complete', [TrainingAgreementController::class, 'adminAutoComplete']);
    Route::get('/{trainingAgreement}/pdf', [TrainingAgreementController::class, 'adminDownloadPdf']);
});
