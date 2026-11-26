<?php

use App\Http\Controllers\Admin\SubscriptionsController;
use Illuminate\Support\Facades\Route;

Route::get('/subscriptions', [SubscriptionsController::class, 'index']);
