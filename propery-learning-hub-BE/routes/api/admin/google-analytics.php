<?php

use App\Http\Controllers\Admin\GoogleAnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware('platform-admin')->group(function () {
    Route::get('/google-analytics', [GoogleAnalyticsController::class, 'index']);
    Route::post('/google-analytics/fetch-clarity', [GoogleAnalyticsController::class, 'fetchAndStore']);
});
