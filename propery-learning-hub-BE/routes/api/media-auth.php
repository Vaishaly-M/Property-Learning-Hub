<?php

use App\Http\Controllers\Api\MediaController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/media/presign-upload', [MediaController::class, 'presignUpload']);
    Route::post('/media/presign-playback', [MediaController::class, 'presignPlayback']);

    Route::get('/media/authenticated', [MediaController::class, 'authenticatedMedia']);
});
