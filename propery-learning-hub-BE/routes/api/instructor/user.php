<?php
// routes/api/admin/users.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\UserActivityController;

Route::prefix('users')->group(function () {
    // User management
    Route::get('/', [UserController::class, 'index'])->name('admin.users.index');
    Route::get('/stats', [UserController::class, 'stats'])->name('admin.users.stats');
    Route::get('/{user}', [UserController::class, 'show'])->name('admin.users.show');
    Route::post('/', [UserController::class, 'store'])->name('admin.users.store');
    Route::put('/{user}', [UserController::class, 'update'])->name('admin.users.update');
    Route::delete('/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
    
    // User actions
    Route::post('/{user}/approve', [UserController::class, 'approve'])->name('admin.users.approve');
    Route::post('/{user}/suspend', [UserController::class, 'suspend'])->name('admin.users.suspend');
    Route::post('/{user}/reactivate', [UserController::class, 'reactivate'])->name('admin.users.reactivate');
    
    // Membership management
    Route::post('/{user}/membership', [UserController::class, 'updateMembership'])->name('admin.users.update-membership');
    
    // Bulk actions
    Route::post('/bulk/actions', [UserController::class, 'bulkAction'])->name('admin.users.bulk-action');
    
    // Activity logs
    Route::get('/{user}/activities', [UserActivityController::class, 'index'])->name('admin.users.activities');
    Route::post('/{user}/activities', [UserActivityController::class, 'store'])->name('admin.users.activities.store');
    Route::delete('/{user}/activities/{activity}', [UserActivityController::class, 'destroy'])->name('admin.users.activities.destroy');
    
    // Admin notes
    Route::get('/{user}/notes', [UserController::class, 'getNotes'])->name('admin.users.notes');
    Route::post('/{user}/notes', [UserController::class, 'saveNotes'])->name('admin.users.notes.save');
});