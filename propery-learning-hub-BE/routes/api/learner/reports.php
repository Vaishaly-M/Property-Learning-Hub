<?php
// routes/api/learner/reports.php

use App\Http\Controllers\Api\Learner\WeeklyReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('learner/reports')->group(function () {
    Route::get('weekly/current', [WeeklyReportController::class, 'current']);
    Route::get('weekly/{weekStart}', [WeeklyReportController::class, 'show']);
    Route::get('weekly', [WeeklyReportController::class, 'index']);
    Route::get('compare', [WeeklyReportController::class, 'compare']);
});