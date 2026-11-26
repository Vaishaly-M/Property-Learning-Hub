<?php

use App\Http\Controllers\Api\MicrosoftAuthController;
use App\Http\Controllers\Api\SessionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Microsoft OAuth — callback is public; connect/disconnect require auth
|--------------------------------------------------------------------------
*/
Route::withoutMiddleware(['auth', 'auth:sanctum'])->group(function () {
    Route::get('/auth/microsoft/callback', [MicrosoftAuthController::class, 'callback']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth/microsoft')->group(function () {
        Route::get('/', [MicrosoftAuthController::class, 'redirect']);
        Route::get('/status', [MicrosoftAuthController::class, 'status']);
        Route::post('/disconnect', [MicrosoftAuthController::class, 'disconnect']);
    });

    Route::get('/sessions/availability', [SessionController::class, 'availability']);
    Route::apiResource('sessions', SessionController::class)->except(['create', 'edit']);
});
