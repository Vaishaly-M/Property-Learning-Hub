<?php

use App\Http\Controllers\Api\Learner\AnnouncementController;
use Illuminate\Support\Facades\Route;

Route::prefix('learner/announcements')->group(function () {
    Route::get('/', [AnnouncementController::class, 'index']);
    Route::post('/{id}/read', [AnnouncementController::class, 'markRead']);
    Route::post('/{id}/bookmark', [AnnouncementController::class, 'toggleBookmark']);
    Route::post('/{id}/pin', [AnnouncementController::class, 'togglePin']);
});
