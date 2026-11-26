<?php

use App\Http\Controllers\Admin\RolePermissionController;
use Illuminate\Support\Facades\Route;

Route::prefix('permissions')->group(function () {
    Route::get('/roles', [RolePermissionController::class, 'index']);
    Route::get('/roles/{role}', [RolePermissionController::class, 'show']);
    Route::put('/roles/{role}', [RolePermissionController::class, 'update']);
    Route::post('/roles/{role}', [RolePermissionController::class, 'update']);
});
