<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Instructor\UserController;
use App\Http\Controllers\Api\Instructor\MeetingController;

// Users (accessible to all authenticated users)
Route::get('/users',      [UserController::class, 'index']);
Route::get('/users/{id}', [UserController::class, 'show']);

// Instructor-only meeting routes
Route::prefix('instructor')->middleware('role:instructor')->group(function () {

    Route::get('meetings/stats', [MeetingController::class, 'stats']);

    Route::apiResource('meetings', MeetingController::class);

    Route::post('meetings/{meeting}/start',    [MeetingController::class, 'startMeeting']);
    Route::post('meetings/{meeting}/complete', [MeetingController::class, 'completeMeeting']);
    Route::post('meetings/{meeting}/cancel',   [MeetingController::class, 'cancelMeeting']);

    Route::get('meetings/{meeting}/participants',                  [MeetingController::class, 'participants']);
    Route::post('meetings/{meeting}/participants',                 [MeetingController::class, 'addParticipants']);
    Route::delete('meetings/{meeting}/participants/{user}',       [MeetingController::class, 'removeParticipant']);
    Route::patch('meetings/{meeting}/participants/{user}/status', [MeetingController::class, 'updateParticipantStatus']);

    Route::post('meetings/{meeting}/registrations/bulk-approve',           [MeetingController::class, 'bulkApproveRegistrations']);
    Route::get('meetings/{meeting}/registrations',                         [MeetingController::class, 'registrations']);
    Route::post('meetings/{meeting}/registrations/{registration}/approve', [MeetingController::class, 'approveRegistration']);
    Route::post('meetings/{meeting}/registrations/{registration}/reject',  [MeetingController::class, 'rejectRegistration']);
});