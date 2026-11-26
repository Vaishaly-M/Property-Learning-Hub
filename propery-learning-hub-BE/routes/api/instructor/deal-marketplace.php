<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Instructor\DealController;

// Public or generic routes
Route::get('/instructor/deals/stats', [DealController::class, 'stats']);
Route::get('/instructor/deals/options', [DealController::class, 'getOptions']);
Route::get('/instructor/deal-marketplace/stats', [DealController::class, 'stats']);
Route::get('/instructor/deal-marketplace/options', [DealController::class, 'getOptions']);

// Protected routes (already wrapped in auth:sanctum in main api.php)
Route::prefix('instructor')->group(function () {
    Route::apiResource('deals', DealController::class)->names([
        'index' => 'instructor.deals.index',
        'store' => 'instructor.deals.store',
        'show' => 'instructor.deals.show',
        'update' => 'instructor.deals.update',
        'destroy' => 'instructor.deals.destroy',
    ]);
    Route::post('/deals/{deal}/increment-inquiries', [DealController::class, 'incrementInquiries']);
    Route::post('/deals/{deal}/publish', [DealController::class, 'publish']);
    Route::post('/deals/{deal}/close', [DealController::class, 'close']);
    Route::post('/deals/{deal}/toggle-featured', [DealController::class, 'toggleFeatured']);
    Route::get('/my-deals', [DealController::class, 'myDeals']);

    Route::apiResource('deal-marketplace', DealController::class)->names([
        'index' => 'instructor.deal-marketplace.index',
        'store' => 'instructor.deal-marketplace.store',
        'show' => 'instructor.deal-marketplace.show',
        'update' => 'instructor.deal-marketplace.update',
        'destroy' => 'instructor.deal-marketplace.destroy',
    ]);
    Route::post('/deal-marketplace/{deal}/increment-inquiries', [DealController::class, 'incrementInquiries']);
    Route::post('/deal-marketplace/{deal}/publish', [DealController::class, 'publish']);
    Route::post('/deal-marketplace/{deal}/close', [DealController::class, 'close']);
    Route::post('/deal-marketplace/{deal}/toggle-featured', [DealController::class, 'toggleFeatured']);
});