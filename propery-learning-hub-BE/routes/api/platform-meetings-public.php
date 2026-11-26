<?php

use App\Http\Controllers\Api\Admin\AdminMicrosoftController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\BookMeetingController;
use App\Http\Controllers\Api\PublicMeetingManageController;
use Illuminate\Support\Facades\Route;

Route::get('/availability', [AvailabilityController::class, 'index']);
Route::get('/meetings/available-slots', [AvailabilityController::class, 'index']);
Route::get('/platform-timezone', [AvailabilityController::class, 'timezone']);

Route::post('/book-meeting', [BookMeetingController::class, 'store']);
Route::post('/public/book-meeting', [BookMeetingController::class, 'store']);

Route::get('/auth/microsoft/callback', [AdminMicrosoftController::class, 'callback']);

Route::prefix('public/meetings/{uuid}')->group(function () {
    Route::get('/', [PublicMeetingManageController::class, 'show']);
    Route::put('/reschedule', [PublicMeetingManageController::class, 'reschedule']);
    Route::put('/cancel', [PublicMeetingManageController::class, 'cancel']);
});
