<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AdminDealController;

/*
|--------------------------------------------------------------------------
| Admin Deal Management Routes
|--------------------------------------------------------------------------
*/

Route::prefix('deals')->group(function () {
    Route::get('/', [AdminDealController::class, 'index']);
    Route::post('/', [AdminDealController::class, 'store']);
    Route::get('/pending', [AdminDealController::class, 'pendingDeals']);
    Route::put('/{deal}', [AdminDealController::class, 'update']); // Changed to PUT
    Route::delete('/{deal}', [AdminDealController::class, 'destroy']);
    Route::post('/{deal}/approve', [AdminDealController::class, 'approveDeal']);
    Route::post('/{deal}/reject', [AdminDealController::class, 'rejectDeal']);
});

Route::prefix('deal-marketplace')->group(function () {
    Route::get('/', [AdminDealController::class, 'index']);
    Route::post('/', [AdminDealController::class, 'store']);
    Route::get('/pending', [AdminDealController::class, 'pendingDeals']);
    Route::post('/{deal}/toggle-featured', [AdminDealController::class, 'toggleFeatured']);
    Route::post('/{deal}/approve', [AdminDealController::class, 'approveDeal']);
    Route::post('/{deal}/reject', [AdminDealController::class, 'rejectDeal']);
    Route::get('/{deal}', [AdminDealController::class, 'show']);
    Route::put('/{deal}', [AdminDealController::class, 'update']); // Changed to PUT
    Route::delete('/{deal}', [AdminDealController::class, 'destroy']);
});

Route::prefix('deal-review')->group(function () {
    Route::get('/', [AdminDealController::class, 'index']);
    Route::post('/', [AdminDealController::class, 'store']);
    Route::get('/pending', [AdminDealController::class, 'pendingDeals']);
    Route::post('/{deal}/approve', [AdminDealController::class, 'approveDeal']);
    Route::post('/{deal}/reject', [AdminDealController::class, 'rejectDeal']);
    Route::get('/{deal}', [AdminDealController::class, 'show']);
    Route::put('/{deal}', [AdminDealController::class, 'update']); // Changed to PUT
    Route::delete('/{deal}', [AdminDealController::class, 'destroy']);
});