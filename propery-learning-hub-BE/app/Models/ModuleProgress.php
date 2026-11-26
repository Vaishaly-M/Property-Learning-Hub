<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModuleProgress extends Model
{
    protected $table = 'module_progress';

    protected $fillable = [
        'user_id',
        'course_id',
        'module_id',
        'progress_percentage',
        'is_completed',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'progress_percentage' => 'integer',
        'is_completed' => 'boolean',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(CourseModule::class, 'module_id');
    }

    /**
     * Recalculate module progress from completed published videos in the module.
     */
    public static function syncForUser(int $userId, int $moduleId): ?self
    {
        $module = CourseModule::with('course')->find($moduleId);
        if (!$module) {
            return null;
        }

        $totalItems = \App\Support\CourseProgressCalculator::totalTrackable($module->course_id, $moduleId);
        $completedItems = \App\Support\CourseProgressCalculator::completedTrackable($module->course_id, $userId, $moduleId);
        $percentage = \App\Support\CourseProgressCalculator::percentage($module->course_id, $userId, $moduleId);
        $isCompleted = $totalItems > 0 && $percentage >= 100;

        $progress = static::firstOrNew([
            'user_id' => $userId,
            'module_id' => $moduleId,
        ]);

        $progress->course_id = $module->course_id;
        $progress->progress_percentage = $percentage;
        $progress->is_completed = $isCompleted;

        if (!$progress->started_at && ($completedItems > 0 || $percentage > 0)) {
            $progress->started_at = now();
        }

        if ($isCompleted) {
            $progress->completed_at = $progress->completed_at ?? now();
        } else {
            $progress->completed_at = null;
        }

        $progress->save();

        return $progress;
    }
}
