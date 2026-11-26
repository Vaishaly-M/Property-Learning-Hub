<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\UserActivityController;

/*
|--------------------------------------------------------------------------
| Admin User Management Routes
|--------------------------------------------------------------------------
*/

Route::prefix('users')->group(function () {

    // List & create
    Route::get('/',                     [UserController::class, 'index']);
    Route::get('/stats',                [UserController::class, 'stats']);
    Route::post('/',                    [UserController::class, 'store']);
    Route::post('/bulk/actions',        [UserController::class, 'bulkAction']);

    // Single user CRUD
    Route::get('/{user}',               [UserController::class, 'show']);
    Route::put('/{user}',               [UserController::class, 'update']);
    Route::delete('/{user}',            [UserController::class, 'destroy']);
    Route::get('/{user}/proof-of-address', [UserController::class, 'downloadProofOfAddress']);

    // Status actions
    Route::post('/{user}/approve',      [UserController::class, 'approve']);
    Route::post('/{user}/suspend',      [UserController::class, 'suspend']);
    Route::post('/{user}/reactivate',   [UserController::class, 'reactivate']);
    Route::post('/{user}/membership',   [UserController::class, 'updateMembership']);

    // Activity logs
    Route::get('/{user}/activities',    [UserActivityController::class, 'index']);
    Route::post('/{user}/activities',   [UserActivityController::class, 'store']);
    Route::delete('/{user}/activities/{activity}', [UserActivityController::class, 'destroy']);

    // Admin notes
    Route::get('/{user}/notes',         [UserController::class, 'getNotes']);
    Route::post('/{user}/notes',        [UserController::class, 'saveNotes']);
});