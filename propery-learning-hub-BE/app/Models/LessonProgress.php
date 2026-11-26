<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonProgress extends Model
{
    protected $table = 'lesson_progress';

    protected $fillable = [
        'user_id',
        'course_id',
        'content_id',
        'watch_time',
        'progress_percentage',
        'is_completed',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'watch_time' => 'integer',
        'progress_percentage' => 'integer',
        'is_completed' => 'boolean',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the user that owns the progress
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the course this progress belongs to
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Get the content (lesson) this progress is for
     */
    public function content(): BelongsTo
    {
        return $this->belongsTo(Content::class);
    }

    /**
     * Update watch time and calculate progress percentage
     */
    public function updateWatchTime(int $watchTime, ?int $totalDuration = null)
    {
        $this->watch_time = $watchTime;

        // Calculate progress percentage
        if ($totalDuration && $totalDuration > 0) {
            $percentage = min(100, round(($watchTime / $totalDuration) * 100));
            $this->progress_percentage = $percentage;

            // Auto-complete if watched 90% or more
            if ($percentage >= 90 && !$this->is_completed) {
                $this->markAsCompleted();
                return;
            }
        }

        $this->save();
    }

    /**
     * Mark the lesson as completed
     */
    public function markAsCompleted()
    {
        $this->is_completed = true;
        $this->progress_percentage = 100;
        $this->completed_at = now();
        $this->save();

        // Update course enrollment progress + module progress
        $this->updateCourseProgress();
        if ($this->content?->module_id) {
            ModuleProgress::syncForUser((int) $this->user_id, (int) $this->content->module_id);
        } elseif ($this->content_id) {
            $moduleId = Content::where('id', $this->content_id)->value('module_id');
            if ($moduleId) {
                ModuleProgress::syncForUser((int) $this->user_id, (int) $moduleId);
            }
        }
    }

    /**
     * Update the overall course progress
     */
    private function updateCourseProgress()
    {
        $enrollment = CourseEnrollment::where('user_id', $this->user_id)
            ->where('course_id', $this->course_id)
            ->first();

        if (!$enrollment) {
            return;
        }

        $progressPercentage = \App\Support\CourseProgressCalculator::percentage(
            (int) $this->course_id,
            (int) $this->user_id
        );

        if (\App\Support\CourseProgressCalculator::totalTrackable((int) $this->course_id) === 0) {
            return;
        }

        $enrollment->update([
            'progress_percentage' => $progressPercentage,
            'status' => $progressPercentage >= 100 ? 'completed' : 'in_progress',
            'completed_at' => $progressPercentage >= 100 ? now() : null
        ]);
    }
}