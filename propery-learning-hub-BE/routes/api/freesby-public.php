<?php

use App\Http\Controllers\Api\Public\FreesbyTemplateLeadController;
use Illuminate\Support\Facades\Route;

Route::post('/public/freesby/template-request', [FreesbyTemplateLeadController::class, 'store']);
