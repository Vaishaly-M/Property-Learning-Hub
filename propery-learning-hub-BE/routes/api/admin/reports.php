<?php
// routes/api/admin/reports.php
use App\Http\Controllers\Api\Admin\WeeklyReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('reports')->group(function () {
    Route::get('weekly/all', [WeeklyReportController::class, 'allUsers']);
    Route::get('weekly/user/{userId}', [WeeklyReportController::class, 'user']);
    Route::post('weekly/generate/{userId}', [WeeklyReportController::class, 'generateForUser']);
    Route::get('weekly/summary', [WeeklyReportController::class, 'summary']);
    Route::get('weekly/top-performers', [WeeklyReportController::class, 'topPerformers']);
});