<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'user_id',
        'thumbnail_path',
        'is_active',
        'order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['content_count'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function instructor()
    {
        return $this->user();
    }

    public function contents()
    {
        return $this->hasMany(Content::class)->orderBy('order');
    }

    public function modules()
    {
        return $this->hasMany(CourseModule::class)->orderBy('order');
    }

    public function publishedModules()
    {
        return $this->hasMany(CourseModule::class)
            ->where('is_published', true)
            ->orderBy('order');
    }

    public function videos()
    {
        return $this->hasMany(Content::class)
                    ->where('type', 'video')
                    ->orderBy('order');
    }

    public function documents()
    {
        return $this->hasMany(Content::class)
                    ->whereIn('type', ['document', 'image'])
                    ->orderBy('order');
    }

    public function enrollments()
    {
        return $this->hasMany(CourseEnrollment::class);
    }

    public function activeEnrollments()
    {
        return $this->hasMany(CourseEnrollment::class)
                    ->where('status', 'active');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopePublished($query)
    {
        return $query->where('is_active', true)
                     ->whereHas('contents', function($q) {
                         $q->where('is_published', true);
                     });
    }

    // Accessors
    public function getContentCountAttribute()
    {
        return $this->contents()->count();
    }

    public function getEnrollmentCountAttribute()
    {
        return $this->enrollments()->count();
    }

    public function getCompletionRateAttribute()
    {
        $completed = $this->enrollments()->where('status', 'completed')->count();
        $total = $this->enrollments()->count();
        
        return $total > 0 ? round(($completed / $total) * 100) : 0;
    }

    // Helper methods
    public function addContent(Content $content, $order = null, ?CourseModule $module = null)
    {
        if ($module === null) {
            $module = $this->modules()->orderBy('order')->first();
            if (!$module) {
                $module = $this->modules()->create([
                    'title' => 'Module 1',
                    'slug' => 'module-1',
                    'order' => 1,
                    'is_published' => true,
                ]);
            }
        }

        if ($order === null) {
            $order = ($module->contents()->max('order') ?? 0) + 1;
        }

        $content->update([
            'course_id' => $this->id,
            'module_id' => $module->id,
            'order' => $order,
        ]);
    }

    public function removeContent(Content $content)
    {
        $content->update([
            'course_id' => null,
            'module_id' => null,
            'order' => 0,
        ]);
    }

    public function reorderContents(array $contentIds)
    {
        foreach ($contentIds as $index => $contentId) {
            $this->contents()->where('id', $contentId)->update(['order' => $index + 1]);
        }
    }

    public function reorderModules(array $moduleIds): void
    {
        foreach ($moduleIds as $index => $moduleId) {
            $this->modules()->where('id', $moduleId)->update(['order' => $index + 1]);
        }
    }

    /**
     * Ensure the course has at least one module (for legacy / empty courses).
     */
    public function ensureDefaultModule(): CourseModule
    {
        $module = $this->modules()->orderBy('order')->first();
        if ($module) {
            return $module;
        }

        return $this->modules()->create([
            'title' => 'Module 1',
            'slug' => 'module-1',
            'description' => null,
            'order' => 1,
            'is_published' => true,
        ]);
    }

    public function enrollUser($userId)
    {
        return CourseEnrollment::firstOrCreate(
            [
                'user_id' => $userId,
                'course_id' => $this->id
            ],
            [
                'status' => 'active',
                'enrolled_at' => now()
            ]
        );
    }

    public function isEnrolled($userId)
    {
        return $this->enrollments()
                    ->where('user_id', $userId)
                    ->exists();
    }

    public function getProgressForUser($userId)
    {
        $enrollment = $this->enrollments()
                          ->where('user_id', $userId)
                          ->first();

        return $enrollment ? $enrollment->progress_percentage : 0;
    }
}