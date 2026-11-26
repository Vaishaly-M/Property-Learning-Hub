<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Learner\MeetingController;

Route::middleware(['auth:sanctum', 'role:learner'])
    ->prefix('learner')
    ->group(function () {

        // ✅ Browse meetings
        Route::get('meetings', [MeetingController::class, 'index']);
        Route::get('meetings/{meeting}', [MeetingController::class, 'show']);

        // ✅ Invitations
        Route::get('meetings/invited', [MeetingController::class, 'invitedMeetings']);

        // ✅ Registrations
        Route::get('meetings/my-registrations', [MeetingController::class, 'myRegistrations']);
        Route::post('meetings/{meeting}/register', [MeetingController::class, 'register']);
        Route::delete('meetings/{meeting}/register', [MeetingController::class, 'cancelRegistration']);

        // ✅ Participation
        Route::post('meetings/{meeting}/join', [MeetingController::class, 'joinMeeting']);
        Route::post('meetings/{meeting}/confirm', [MeetingController::class, 'confirmAttendance']);
        Route::post('meetings/{meeting}/decline', [MeetingController::class, 'declineInvitation']);
    });