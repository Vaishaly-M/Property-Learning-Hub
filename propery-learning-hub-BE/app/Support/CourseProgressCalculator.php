<?php

namespace App\Support;

use App\Models\Content;
use App\Models\LessonProgress;

class CourseProgressCalculator
{
    /** Content types that count toward course/module completion. */
    public static function trackableTypes(): array
    {
        return ['video', 'document', 'image'];
    }

    public static function trackableContentQuery(int $courseId, ?int $moduleId = null)
    {
        $query = Content::query()
            ->where('course_id', $courseId)
            ->whereIn('type', self::trackableTypes())
            ->where('is_published', true);

        if ($moduleId !== null) {
            $query->where('module_id', $moduleId);
        }

        return $query;
    }

    public static function totalTrackable(int $courseId, ?int $moduleId = null): int
    {
        return self::trackableContentQuery($courseId, $moduleId)->count();
    }

    public static function completedTrackable(int $courseId, int $userId, ?int $moduleId = null): int
    {
        return LessonProgress::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->where('is_completed', true)
            ->whereHas('content', function ($q) use ($moduleId) {
                $q->whereIn('type', self::trackableTypes())
                    ->where('is_published', true);
                if ($moduleId !== null) {
                    $q->where('module_id', $moduleId);
                }
            })
            ->count();
    }

    public static function percentage(int $courseId, int $userId, ?int $moduleId = null): int
    {
        $total = self::totalTrackable($courseId, $moduleId);
        if ($total === 0) {
            return 0;
        }

        $completed = self::completedTrackable($courseId, $userId, $moduleId);

        return (int) round(($completed / $total) * 100);
    }
}
