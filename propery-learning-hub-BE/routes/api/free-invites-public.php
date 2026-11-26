<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FreeRegistrationInviteController;

Route::prefix('free-invites')->group(function () {
    Route::get('/{token}/visit', [FreeRegistrationInviteController::class, 'visit']);
});
