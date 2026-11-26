<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AnalyticsController;

Route::get('/analytics', [AnalyticsController::class, 'index']);
