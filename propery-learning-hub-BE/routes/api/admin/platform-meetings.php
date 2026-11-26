<?php

use App\Http\Controllers\Api\Admin\AdminAvailabilityBlockController;
use App\Http\Controllers\Api\Admin\AdminMicrosoftController;
use App\Http\Controllers\Api\Admin\AvailabilitySettingsController;
use App\Http\Controllers\Api\PlatformMeetingController;
use Illuminate\Support\Facades\Route;

Route::get('/meetings', [PlatformMeetingController::class, 'adminIndex']);
Route::get('/availability-settings', [AvailabilitySettingsController::class, 'show']);
Route::put('/availability-settings', [AvailabilitySettingsController::class, 'update']);

Route::get('/microsoft/status', [AdminMicrosoftController::class, 'status']);
Route::get('/microsoft/connect', [AdminMicrosoftController::class, 'connect']);
Route::post('/microsoft/disconnect', [AdminMicrosoftController::class, 'disconnect']);

Route::get('/availability-blocks', [AdminAvailabilityBlockController::class, 'index']);
Route::post('/availability-blocks', [AdminAvailabilityBlockController::class, 'store']);
Route::delete('/availability-blocks/{block}', [AdminAvailabilityBlockController::class, 'destroy']);
