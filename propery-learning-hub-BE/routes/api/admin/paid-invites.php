<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PaidUserInviteController;

Route::prefix('paid-invites')->group(function () {
    Route::get('/', [PaidUserInviteController::class, 'adminIndex']);
    Route::post('/', [PaidUserInviteController::class, 'adminStore']);
    Route::post('/{paidUserInvite}/resend', [PaidUserInviteController::class, 'adminResendEmail']);
});
