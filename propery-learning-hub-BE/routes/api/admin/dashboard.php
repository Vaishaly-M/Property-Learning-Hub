<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\InfinitWizardController;

Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');

// InfinitWizard SSO (create account + VIP + auto-login token for feature dashboards)
Route::post('/infinitwizard/sso', [InfinitWizardController::class, 'sso'])
    ->name('admin.infinitwizard.sso');
