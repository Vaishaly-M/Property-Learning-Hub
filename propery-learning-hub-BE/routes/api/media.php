<?php

use App\Http\Controllers\Api\MediaController;
use Illuminate\Support\Facades\Route;

Route::get('/media/inline', [MediaController::class, 'inline']);
Route::get('/media/stream', [MediaController::class, 'stream']);
/** Public — tells the frontend whether direct S3 upload is enabled (no secrets). */
Route::get('/media/upload-config', [MediaController::class, 'uploadConfig']);
