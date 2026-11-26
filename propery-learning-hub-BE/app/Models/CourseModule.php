<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseModule extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'title',
        'slug',
        'description',
        'thumbnail_path',
        'order',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'order' => 'integer',
    ];

    protected $appends = ['content_count', 'video_count', 'document_count'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function contents(): HasMany
    {
        return $this->hasMany(Content::class, 'module_id')->orderBy('order');
    }

    public function videos(): HasMany
    {
        return $this->hasMany(Content::class, 'module_id')
            ->where('type', 'video')
            ->orderBy('order');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Content::class, 'module_id')
            ->whereIn('type', ['document', 'image'])
            ->orderBy('order');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(ModuleProgress::class, 'module_id');
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function getContentCountAttribute(): int
    {
        if (array_key_exists('contents_count', $this->attributes)) {
            return (int) $this->attributes['contents_count'];
        }

        return $this->contents()->count();
    }

    public function getVideoCountAttribute(): int
    {
        return $this->contents()->where('type', 'video')->count();
    }

    public function getDocumentCountAttribute(): int
    {
        return $this->contents()->whereIn('type', ['document', 'image'])->count();
    }

    public function reorderContents(array $contentIds): void
    {
        foreach ($contentIds as $index => $contentId) {
            $this->contents()->where('id', $contentId)->update([
                'order' => $index + 1,
                'course_id' => $this->course_id,
                'module_id' => $this->id,
            ]);
        }
    }

    /**
     * Published video lessons in this module, ordered.
     */
    public function publishedVideos()
    {
        return $this->videos()->where('is_published', true);
    }
}
