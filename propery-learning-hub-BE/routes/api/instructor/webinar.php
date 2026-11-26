<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Instructor\WebinarController as InstructorWebinarController;

Route::prefix('instructor/webinars')->group(function () {

    // Fixed routes first
    Route::get('/stats', [InstructorWebinarController::class, 'stats']);

    // Past Recordings
    Route::get('/past-recordings', [InstructorWebinarController::class, 'getPastRecordings']);
    Route::post('/past-recordings', [InstructorWebinarController::class, 'storePastRecording']);
    Route::delete('/past-recordings/{id}', [InstructorWebinarController::class, 'deletePastRecording']);

    // CRUD
    Route::get('/', [InstructorWebinarController::class, 'index']);
    Route::post('/', [InstructorWebinarController::class, 'store']);

    // More specific dynamic routes before /{id}
    Route::get('/{id}/analytics', [InstructorWebinarController::class, 'webinarAnalytics']);

    Route::get('/{id}/registrations', [InstructorWebinarController::class, 'registrations']);
    Route::post('/{id}/registrations/bulk-approve', [InstructorWebinarController::class, 'bulkApprove']);
    Route::post('/{id}/registrations/{regId}/approve', [InstructorWebinarController::class, 'approveRegistration']);
    Route::post('/{id}/registrations/{regId}/reject', [InstructorWebinarController::class, 'rejectRegistration']);
    Route::patch('/{id}/registrations/{regId}/attendance', [InstructorWebinarController::class, 'markAttendance']);
    Route::get('/{id}/registrations/export', [InstructorWebinarController::class, 'exportRegistrants']);
    Route::post('/{id}/send-reminders', [InstructorWebinarController::class, 'sendReminders']);

    Route::post('/{id}/start', [InstructorWebinarController::class, 'startWebinar']);
    Route::post('/{id}/complete', [InstructorWebinarController::class, 'completeWebinar']);
    Route::post('/{id}/cancel', [InstructorWebinarController::class, 'cancelWebinar']);

    Route::post('/{id}/recording', [InstructorWebinarController::class, 'uploadRecording']);
    Route::delete('/{id}/recording', [InstructorWebinarController::class, 'deleteRecording']);
    Route::get('/{id}/recording/stream', [InstructorWebinarController::class, 'streamRecording']);

    Route::get('/{id}/recording-access', [InstructorWebinarController::class, 'recordingAccessRequests']);
    Route::post('/{id}/recording-access/{accessId}/approve', [InstructorWebinarController::class, 'approveRecordingAccess']);
    Route::post('/{id}/recording-access/{accessId}/reject', [InstructorWebinarController::class, 'rejectRecordingAccess']);
    Route::post('/{id}/recording-access/{accessId}/revoke', [InstructorWebinarController::class, 'revokeRecordingAccess']);

    // Keep /{id} routes last
    Route::get('/{id}', [InstructorWebinarController::class, 'show']);
    Route::put('/{id}', [InstructorWebinarController::class, 'update']);
    Route::patch('/{id}', [InstructorWebinarController::class, 'update']);
    Route::delete('/{id}', [InstructorWebinarController::class, 'destroy']);
});