<?php

namespace App\Models;

use App\Support\CourseProgressCalculator;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'status',
        'progress_percentage',
        'enrolled_at',
        'completed_at',
        'last_accessed_at'
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_accessed_at' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function lessonProgress()
    {
        return $this->hasMany(LessonProgress::class, 'user_id', 'user_id')
                    ->where('course_id', $this->course_id);
    }

    // Helper methods
    public function updateProgress()
    {
        $courseId = (int) $this->course_id;
        $userId = (int) $this->user_id;
        $total = CourseProgressCalculator::totalTrackable($courseId);

        if ($total === 0) {
            $this->update(['progress_percentage' => 0]);
            return;
        }

        $progress = CourseProgressCalculator::percentage($courseId, $userId);

        $updateData = [
            'progress_percentage' => $progress,
            'last_accessed_at' => now()
        ];

        // Mark as completed if all lessons are done
        if ($progress >= 100 && !$this->completed_at) {
            $updateData['completed_at'] = now();
            $updateData['status'] = 'completed';
        }

        $this->update($updateData);
    }

    public function getNextLesson()
    {
        // Get all lessons in order
        $lessons = $this->course->contents()->orderBy('order')->get();
        
        // Get completed lesson IDs
        $completedIds = LessonProgress::where('user_id', $this->user_id)
            ->where('course_id', $this->course_id)
            ->where('is_completed', true)
            ->pluck('content_id')
            ->toArray();

        // Find first incomplete lesson
        foreach ($lessons as $lesson) {
            if (!in_array($lesson->id, $completedIds)) {
                return $lesson;
            }
        }

        // If all complete, return first lesson for review
        return $lessons->first();
    }

    public function getCurrentLesson()
    {
        // Get the last accessed incomplete lesson
        $lastProgress = LessonProgress::where('user_id', $this->user_id)
            ->where('course_id', $this->course_id)
            ->where('is_completed', false)
            ->orderBy('updated_at', 'desc')
            ->first();

        if ($lastProgress) {
            return $lastProgress->content;
        }

        return $this->getNextLesson();
    }
}