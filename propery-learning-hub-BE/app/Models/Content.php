<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Content extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'category_id',
        'user_id',
        'course_id',
        'module_id',
        'order',
        'type',
        'file_path',
        'file_name',
        'file_size',
        'duration',
        'thumbnail_path',
        'views',
        'downloads',
        'is_published',
        'is_featured',
        'metadata',
        'published_at'
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'is_featured' => 'boolean',
        'metadata' => 'array',
        'published_at' => 'datetime'
    ];

    protected $appends = ['formatted_size', 'formatted_date'];

    // Relationships
    public function category()
    {
        return $this->belongsTo(ContentCategory::class, 'category_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    public function course()
    {
        return $this->belongsTo(Course::class, 'course_id');
    }

    public function module()
    {
        return $this->belongsTo(CourseModule::class, 'module_id');
    }
    
    // Alias for backward compatibility
    public function instructor()
    {
        return $this->user();
    }

    // Scopes
    public function scopePublished($query)
    {
       return $query->where('is_published', true)
                 ->whereNotNull('published_at');
    }

    public function scopeVideos($query)
    {
        return $query->where('type', 'video');
    }

    public function scopeDocuments($query)
    {
        return $query->whereIn('type', ['document', 'image']);
    }

    public function scopeImages($query)
    {
        return $query->where('type', 'image');
    }

    public function scopeByModule($query, $moduleId)
    {
        return $query->where('module_id', $moduleId)->orderBy('order');
    }

    public function scopeByInstructor($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
    
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByCourse($query, $courseId)
    {
        return $query->where('course_id', $courseId)->orderBy('order');
    }

    public function scopeWithoutCourse($query)
    {
        return $query->whereNull('course_id');
    }

    // Accessors
    public function getFormattedSizeAttribute()
    {
        if (!$this->file_size) return null;
        
        $size = (int) $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }
        
        return round($size, 2) . ' ' . $units[$i];
    }

    public function getFormattedDateAttribute()
    {
        return $this->created_at->format('M d, Y');
    }

    public function getUploadDateAttribute()
    {
        return $this->created_at->format('Y-m-d');
    }

    // Helper methods
    public function incrementViews()
    {
        $this->increment('views');
    }

    public function incrementDownloads()
    {
        $this->increment('downloads');
    }

    public function togglePublish()
    {
        $this->update([
            'is_published' => !$this->is_published,
            'published_at' => !$this->is_published ? now() : null
        ]);
    }

    public function moveToCourse($courseId, $order = null)
    {
        if ($order === null) {
            $order = self::where('course_id', $courseId)->max('order') + 1;
        }
        
        $this->update([
            'course_id' => $courseId,
            'order' => $order
        ]);
    }

    public function removeFromCourse()
    {
        $this->update([
            'course_id' => null,
            'order' => 0
        ]);
    }
}