<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FreeRegistrationInviteController;

Route::prefix('free-invites')->group(function () {
    Route::get('/', [FreeRegistrationInviteController::class, 'adminIndex']);
    Route::get('/open-link', [FreeRegistrationInviteController::class, 'adminOpenLink']);
    Route::post('/', [FreeRegistrationInviteController::class, 'adminStore']);
    Route::post('/{freeRegistrationInvite}/resend', [FreeRegistrationInviteController::class, 'adminResendEmail']);
});
