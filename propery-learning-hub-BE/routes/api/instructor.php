<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InstructorProfileController;
use App\Http\Controllers\Api\InstructorMyProfileController;

Route::prefix('instructor')->group(function () {

    Route::get('/my-profile', [InstructorMyProfileController::class, 'getCompleteProfile']);
    Route::put('/my-profile', [InstructorMyProfileController::class, 'updateProfile']);
    Route::put('/my-profile/picture', [InstructorMyProfileController::class, 'updateProfilePicture']);
    Route::put('/my-profile/change-password', [InstructorMyProfileController::class, 'changePassword']);
    Route::post('/my-profile/complete', [InstructorMyProfileController::class, 'completeProfile']);

    Route::prefix('profile')->group(function () {
        Route::get('/', [InstructorProfileController::class, 'show']);
        Route::put('/', [InstructorProfileController::class, 'update']);
        Route::post('/complete', [InstructorProfileController::class, 'complete']);
    });
});
