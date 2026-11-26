<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('crm:send-scheduled-communications')->everyMinute();
Schedule::command('crm:send-webinar-reminders')->hourly();
Schedule::command('crm:send-webinar-follow-ups')->daily();

// Fetch Clarity analytics data daily at 11:55 PM London time
Schedule::command('clarity:fetch-data')
    ->dailyAt('23:55')
    ->timezone(config('clarity.timezone', 'Europe/London'))
    ->appendOutputTo(storage_path('logs/clarity-fetch.log'))
    ->emailOutputOnFailure(config('clarity.failure_alert_email'));

// Send weekly learning reports every Saturday at 9:00 AM London time
Schedule::command('reports:send-weekly')
    ->weeklyOn(6, '09:00')  // 6 = Saturday (0=Sunday, 1=Monday, etc.)
    ->timezone('Europe/London')
    ->appendOutputTo(storage_path('logs/weekly-reports.log'))
    ->emailOutputOnFailure('info@befreepropertyeducation.com'); 