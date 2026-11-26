<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Learner\WebinarController as LearnerWebinarController;

// ============================================================
// LEARNER ROUTES
// ============================================================
Route::prefix('learner/webinars')->group(function () {

    // ── Fixed routes FIRST (before /{id} to avoid conflicts) ──────────────

    // My registrations list
    Route::get('/my-registrations', [LearnerWebinarController::class, 'myRegistrations']);

    // ── Browse ─────────────────────────────────────────────────────────────
    Route::get('/', [LearnerWebinarController::class, 'index']);

    // ── Dynamic /{id} routes ───────────────────────────────────────────────
    Route::get('/{id}', [LearnerWebinarController::class, 'show']);

    // Registration
    Route::post('/{id}/payment-intent', [LearnerWebinarController::class, 'createRegistrationPaymentIntent']);
    Route::post('/{id}/register',   [LearnerWebinarController::class, 'register']);
    Route::delete('/{id}/register', [LearnerWebinarController::class, 'cancelRegistration']);
    Route::post('/{id}/join', [LearnerWebinarController::class, 'joinLive']);

    // Recording access
    Route::get('/{id}/recording-access',          [LearnerWebinarController::class, 'myRecordingAccess']);
    Route::post('/{id}/recording-access/request', [LearnerWebinarController::class, 'requestRecordingAccess']);
    Route::get('/{id}/recording/download',        [LearnerWebinarController::class, 'downloadRecording']);
    Route::get('/{id}/recording/file',            [LearnerWebinarController::class, 'streamRecordingFile'])
        ->name('api.learner.webinars.recording.file')
        ->withoutMiddleware(['auth:sanctum']);
    Route::post('/{id}/recording/download/complete', [LearnerWebinarController::class, 'completeRecordingDownload']);
    Route::get('/{id}/recording/stream',          [LearnerWebinarController::class, 'streamRecording']);
});