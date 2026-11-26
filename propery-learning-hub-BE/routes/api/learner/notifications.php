<?php

use App\Http\Controllers\Api\Learner\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('learner/notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unreadCountEndpoint']);
    Route::post('/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::post('/{id}/read', [NotificationController::class, 'markRead']);
    Route::delete('/{id}', [NotificationController::class, 'destroy']);
});
