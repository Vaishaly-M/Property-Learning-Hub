<?php

use App\Http\Controllers\Api\PlatformMeetingController;
use Illuminate\Support\Facades\Route;

Route::get('/my-meetings', [PlatformMeetingController::class, 'index']);
Route::get('/meetings/{platform_meeting}', [PlatformMeetingController::class, 'show']);
Route::put('/meetings/{platform_meeting}/reschedule', [PlatformMeetingController::class, 'reschedule']);
Route::put('/meetings/{platform_meeting}/cancel', [PlatformMeetingController::class, 'cancel']);
Route::delete('/meetings/{platform_meeting}', [PlatformMeetingController::class, 'destroy']);
