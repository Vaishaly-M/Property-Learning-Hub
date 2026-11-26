<?php

namespace App\Listeners;

use App\Events\LessonCompleted;
use App\Services\BadgeService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class HandleLessonCompletion implements ShouldQueue
{
    use InteractsWithQueue;

    protected BadgeService $badgeService;

    public function __construct(BadgeService $badgeService)
    {
        $this->badgeService = $badgeService;
    }

    public function handle(LessonCompleted $event): void
    {
        $totalLessons = $event->user->lessonProgress()
            ->where('is_completed', true)
            ->count();
            
        $this->badgeService->checkAndAwardBadges(
            $event->user,
            'lesson_completed',
            [
                'is_first' => $totalLessons === 1,
                'total_lessons_completed' => $totalLessons,
            ]
        );
    }
}