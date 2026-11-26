<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PaidUserInviteController;

Route::prefix('paid-invites')->group(function () {
    Route::get('/{token}/visit', [PaidUserInviteController::class, 'visit']);
});
