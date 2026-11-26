<?php

use App\Http\Controllers\Api\Learner\ContractController;
use Illuminate\Support\Facades\Route;

Route::prefix('learner/contracts')->group(function () {
    Route::get('/',                 [ContractController::class, 'index']);
    Route::post('/',                [ContractController::class, 'store']);
    Route::get('/my-templates',     [ContractController::class, 'myTemplates']);
    Route::get('/purchased',        [ContractController::class, 'purchased']);
    Route::get('/{id}',             [ContractController::class, 'show']);
    Route::post('/{id}',            [ContractController::class, 'update']);
    Route::delete('/{id}',          [ContractController::class, 'destroy']);
    Route::get('/{id}/download',    [ContractController::class, 'download']);
    Route::post('/{id}/purchase',   [ContractController::class, 'purchase']);
    Route::post('/{id}/esign',      [ContractController::class, 'initiateESign']);
});