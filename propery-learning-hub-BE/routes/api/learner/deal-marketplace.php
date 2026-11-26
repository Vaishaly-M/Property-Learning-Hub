<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Learner\LearnerDealController;
use App\Http\Controllers\Api\Learner\DealFavoriteController;

/*
|--------------------------------------------------------------------------
| Learner Deal Marketplace Routes
|--------------------------------------------------------------------------
*/

Route::prefix('learner')->group(function () {
    
    // Get all verified/all deals (verified is visible to all, all shows own too)
    Route::get('/deals', [LearnerDealController::class, 'index']);
    Route::get('/deal-marketplace', [LearnerDealController::class, 'index']);
    
    // Create new deal (learner workflow)
    Route::post('/deals', [LearnerDealController::class, 'store']);
    Route::post('/deal-marketplace', [LearnerDealController::class, 'store']);
    
    // Get featured deals
    Route::get('/deals/featured/list', [LearnerDealController::class, 'featured']);
    Route::get('/deal-marketplace/featured/list', [LearnerDealController::class, 'featured']);

    // Deal favorites
    Route::get('/deals/favorites', [DealFavoriteController::class, 'index']);
    Route::get('/deal-marketplace/favorites', [DealFavoriteController::class, 'index']);
    Route::post('/deals/{id}/favorite', [DealFavoriteController::class, 'toggle']);
    Route::post('/deal-marketplace/{id}/favorite', [DealFavoriteController::class, 'toggle']);
    Route::get('/deals/{id}/favorite/status', [DealFavoriteController::class, 'status']);
    Route::get('/deal-marketplace/{id}/favorite/status', [DealFavoriteController::class, 'status']);
    
    // Get a single deal details
    Route::get('/deals/{id}', [LearnerDealController::class, 'show']);
    Route::get('/deal-marketplace/{id}', [LearnerDealController::class, 'show']);

    // Publish a deal (learner workflow)
    Route::post('/deals/{id}/publish', [LearnerDealController::class, 'publish']);
    Route::post('/deal-marketplace/{id}/publish', [LearnerDealController::class, 'publish']);
    Route::post('/deals/{id}/send-to-marketplace', [LearnerDealController::class, 'sendToMarketplace']);
    Route::post('/deal-marketplace/{id}/send-to-marketplace', [LearnerDealController::class, 'sendToMarketplace']);
    
    // Edit/update deal (including resubmission)
    Route::post('/deals/{id}', [LearnerDealController::class, 'update']);
    Route::post('/deal-marketplace/{id}', [LearnerDealController::class, 'update']);
    Route::delete('/deals/{id}', [LearnerDealController::class, 'destroy']);
    Route::delete('/deal-marketplace/{id}', [LearnerDealController::class, 'destroy']);
    
    // Get deals by specific mentor
    Route::get('/deals/mentor/{mentorId}', [LearnerDealController::class, 'byMentor']);
    Route::get('/deal-marketplace/mentor/{mentorId}', [LearnerDealController::class, 'byMentor']);
    
    // Get deal statistics
    Route::get('/deals/stats/overview', [LearnerDealController::class, 'stats']);
    Route::get('/deal-marketplace/stats/overview', [LearnerDealController::class, 'stats']);
    
    // Get filter options
    Route::get('/deals/filters/options', [LearnerDealController::class, 'filterOptions']);
    Route::get('/deal-marketplace/filters/options', [LearnerDealController::class, 'filterOptions']);
    
    // Record an inquiry
    Route::post('/deals/{id}/inquiry', [LearnerDealController::class, 'inquiry']);
    Route::post('/deal-marketplace/{id}/inquiry', [LearnerDealController::class, 'inquiry']);

    // Record a view
    Route::post('/deals/{id}/view', [LearnerDealController::class, 'recordView']);
    Route::post('/deal-marketplace/{id}/view', [LearnerDealController::class, 'recordView']);

    // Deal Review aliases (same handlers — pass listing_kind=review)
    Route::get('/deal-review', [LearnerDealController::class, 'index']);
    Route::post('/deal-review', [LearnerDealController::class, 'store']);
    Route::get('/deal-review/{id}', [LearnerDealController::class, 'show']);
    Route::post('/deal-review/{id}', [LearnerDealController::class, 'update']);
    Route::delete('/deal-review/{id}', [LearnerDealController::class, 'destroy']);
    Route::post('/deal-review/{id}/send-to-marketplace', [LearnerDealController::class, 'sendToMarketplace']);
});