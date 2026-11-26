<?php

namespace App\Listeners;

use App\Events\CourseCompleted;
use App\Services\CertificateService;
use App\Services\BadgeService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class HandleCourseCompletion implements ShouldQueue
{
    use InteractsWithQueue;

    protected CertificateService $certificateService;
    protected BadgeService $badgeService;

    public function __construct(
        CertificateService $certificateService,
        BadgeService $badgeService
    ) {
        $this->certificateService = $certificateService;
        $this->badgeService = $badgeService;
    }

    public function handle(CourseCompleted $event): void
    {
        // Issue certificate
        $this->certificateService->issueCertificate(
            $event->user,
            $event->course,
            $event->metadata ?? []
        );
        
        // Check and award badges
        $totalCourses = $event->user->courseEnrollments()
            ->where('status', 'completed')
            ->count();
            
        $this->badgeService->checkAndAwardBadges(
            $event->user,
            'course_completed',
            [
                'is_first' => $totalCourses === 1,
                'total_courses_completed' => $totalCourses,
                'course_title' => $event->course->title,
            ]
        );
    }
}