<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate; 
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use App\Models\ContractTemplate;
use App\Models\CourseEnrollment;
use App\Models\MeetingRegistration;
use App\Models\PlatformMeeting;
use App\Models\MentorSession;
use App\Models\WebinarRegistration;
use App\Observers\CourseEnrollmentObserver;
use App\Observers\MeetingRegistrationObserver;
use App\Observers\WebinarRegistrationObserver;
use App\Policies\ContractTemplatePolicy;
use App\Policies\MentorSessionPolicy;
use App\Policies\PlatformMeetingPolicy;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        if ($this->app->environment('local')) {
            config([
                'broadcasting.connections.pusher.client_options' => [
                    'verify' => false,
                    'curl' => [
                        CURLOPT_SSL_VERIFYPEER => false,
                        CURLOPT_SSL_VERIFYHOST => 0,
                    ],
                ],
            ]);
        }

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

         Gate::policy(ContractTemplate::class, ContractTemplatePolicy::class);
         Gate::policy(MentorSession::class, MentorSessionPolicy::class);
         Gate::policy(PlatformMeeting::class, PlatformMeetingPolicy::class);

        WebinarRegistration::observe(WebinarRegistrationObserver::class);
        CourseEnrollment::observe(CourseEnrollmentObserver::class);
        MeetingRegistration::observe(MeetingRegistrationObserver::class);
    }
}