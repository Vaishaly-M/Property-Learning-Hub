<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseModule;
use App\Models\LessonProgress;
use App\Models\ModuleProgress;
use App\Models\Content;
use App\Support\CourseProgressCalculator;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LearnerCourseController extends Controller
{
    /**
     * Get all available courses for enrollment
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = Course::with(['user', 'contents'])
            ->where('is_active', true)
            ->whereHas('contents', function($q) {
                $q->where('is_published', true);
            })
            ->orderBy('order')
            ->orderBy('id');

        // Search
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        // Filter enrolled/not enrolled (supports ?filter= or ?enrolled=)
        $enrolledFilter = $request->get('enrolled');
        if ($enrolledFilter === null && $request->filled('filter')) {
            $filter = $request->get('filter');
            if (in_array($filter, ['enrolled', 'true'], true)) {
                $enrolledFilter = 'true';
            } elseif (in_array($filter, ['available', 'false'], true)) {
                $enrolledFilter = 'false';
            }
        }

        if ($enrolledFilter !== null) {
            if ($enrolledFilter === 'true') {
                $query->whereHas('enrollments', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } elseif ($enrolledFilter === 'false') {
                $query->whereDoesntHave('enrollments', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            }
        }

        $courses = $query->get()->map(function($course) use ($user) {
            return $this->transformCourseForLearner($course, $user->id);
        });

        return response()->json([
            'success' => true,
            'data' => $courses
        ]);
    }

    /**
     * Get enrolled courses for the learner
     */
    public function myEnrollments(Request $request)
    {
        $user = auth()->user();

        $query = CourseEnrollment::with(['course.user', 'course.contents'])
            ->where('user_id', $user->id);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Sort
        $sort = $request->get('sort', 'last_accessed_at');
        $order = $request->get('order', 'desc');
        $query->orderBy($sort, $order);

        $enrollments = $query->get()->map(function($enrollment) use ($user) {
            $course = $enrollment->course;
            $data = $this->transformCourseForLearner($course, $user->id);
            
            // Recalculate progress
            $progress = $this->calculateCourseProgress($course->id, $user->id);
            
            $data['enrollment'] = [
                'id' => $enrollment->id,
                'status' => $enrollment->status,
                'progress' => $progress,
                'enrolledAt' => $enrollment->enrolled_at->toISOString(),
                'lastAccessedAt' => $enrollment->last_accessed_at?->toISOString(),
                'completedAt' => $enrollment->completed_at?->toISOString(),
            ];
            $data['progress'] = $progress;

            return $data;
        });

        return response()->json([
            'success' => true,
            'data' => $enrollments
        ]);
    }

    /**
     * Get single course details with lessons
     */
    public function show($id)
    {
        $user = auth()->user();
        
        $course = Course::with([
                'user',
                'modules' => fn ($q) => $q->where('is_published', true)->orderBy('order')
                    ->with(['contents' => fn ($cq) => $cq->where('is_published', true)->orderBy('order')->with('category')]),
                'contents.category',
            ])
            ->where('is_active', true)
            ->findOrFail($id);

        // Ensure modules exist and orphan content is attached
        $defaultModule = $course->ensureDefaultModule();
        Content::where('course_id', $course->id)
            ->whereNull('module_id')
            ->update(['module_id' => $defaultModule->id]);

        $course->load([
            'modules' => fn ($q) => $q->where('is_published', true)->orderBy('order')
                ->with(['contents' => fn ($cq) => $cq->where('is_published', true)->orderBy('order')->with('category')]),
        ]);

        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        // Auto-enroll so learners can open the course and browse modules
        if (!$enrollment) {
            $enrollment = $course->enrollUser($user->id);
        }

        // Get lesson progress
        $lessonProgress = LessonProgress::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->get()
            ->keyBy(fn ($p) => (string) $p->content_id);

        $moduleProgress = ModuleProgress::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->get()
            ->keyBy(fn ($p) => (string) $p->module_id);

        $orderedVideos = $this->orderedPublishedVideos($course);

        $modules = $course->modules->map(function ($module) use ($lessonProgress, $moduleProgress, $user, $course, $orderedVideos) {
            $contents = $module->contents->map(function ($content) use ($lessonProgress, $user, $course, $orderedVideos) {
                $progress = $lessonProgress->get((string) $content->id);
                $isCompleted = (bool) ($progress?->is_completed);
                // Completed lessons must never appear locked in the API payload.
                $isUnlocked = $isCompleted || $this->isLessonUnlocked($content, $course, $user->id, $orderedVideos);

                return [
                    'id' => $content->id,
                    'title' => $content->title,
                    'description' => $content->description,
                    'type' => $content->type,
                    'order' => $content->order,
                    'moduleId' => $content->module_id,
                    'duration' => $content->duration,
                    'thumbnailUrl' => MediaUrl::url($content->thumbnail_path),
                    'file_name' => $content->file_name,
                    'file_size' => $content->file_size,
                    'has_file' => !empty($content->file_path),
                    'isCompleted' => $isCompleted,
                    'isUnlocked' => $isUnlocked,
                    'progress' => $progress ? [
                        'percentage' => $progress->progress_percentage,
                        'watchTime' => $progress->watch_time,
                        'startedAt' => $progress->started_at?->toISOString(),
                        'completedAt' => $progress->completed_at?->toISOString(),
                    ] : null,
                    'category' => optional($content->category)->name,
                ];
            })->values();

            $mp = $moduleProgress->get((string) $module->id) ?? ModuleProgress::syncForUser($user->id, $module->id);

            return [
                'id' => $module->id,
                'title' => $module->title,
                'description' => $module->description,
                'thumbnailUrl' => MediaUrl::url($module->thumbnail_path),
                'order' => $module->order,
                'progress' => $mp?->progress_percentage ?? 0,
                'isCompleted' => (bool) ($mp?->is_completed ?? false),
                'contents' => $contents,
                'lessons' => $contents->where('type', 'video')->values(),
                'videos' => $contents->where('type', 'video')->values(),
                'documents' => $contents->whereIn('type', ['document', 'image'])->values(),
            ];
        })->values();

        // Flat lessons for backward compatibility (ordered across modules)
        $lessons = $modules->flatMap(fn ($m) => $m['contents'])->values();

        // Calculate actual progress
        $actualProgress = $this->calculateCourseProgress($course->id, $user->id);
        
        // Update enrollment progress
        $enrollment->update([
            'progress_percentage' => $actualProgress,
            'status' => $actualProgress >= 100 ? 'completed' : 'in_progress'
        ]);

        $data = $this->transformCourseForLearner($course, $user->id);
        $data['modules'] = $modules;
        $data['lessons'] = $lessons;
        $data['videos'] = $lessons->where('type', 'video')->values();
        $data['documents'] = $lessons->whereIn('type', ['document', 'image'])->values();
        $data['progress'] = $actualProgress;
        $data['enrollment'] = [
            'id' => $enrollment->id,
            'status' => $enrollment->status,
            'progress' => $actualProgress,
            'enrolledAt' => $enrollment->enrolled_at->toISOString(),
            'lastAccessedAt' => $enrollment->last_accessed_at?->toISOString(),
            'completedAt' => $enrollment->completed_at?->toISOString(),
        ];

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Enroll in a course
     */
    public function enroll($id)
    {
        $user = auth()->user();
        $course = Course::findOrFail($id);

        if (!$course->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This course is not available for enrollment'
            ], 403);
        }

        $enrollment = $course->enrollUser($user->id);

        return response()->json([
            'success' => true,
            'message' => 'Successfully enrolled in the course',
            'data' => [
                'enrollmentId' => $enrollment->id,
                'courseId' => $course->id,
                'courseTitle' => $course->title
            ]
        ]);
    }

    /**
     * Get a specific lesson
     */
    public function getLesson($courseId, $lessonId)
    {
        $user = auth()->user();
        
        $course = Course::findOrFail($courseId);
        $lesson = Content::where('course_id', $courseId)
            ->where('id', $lessonId)
            ->where('is_published', true)
            ->firstOrFail();

        // Check enrollment
        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->first();

        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'You are not enrolled in this course'
            ], 403);
        }

        // Check if lesson is unlocked
        if (!$this->isLessonUnlocked($lesson, $course, $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You must complete previous lessons before accessing this one'
            ], 403);
        }

        // Get or create progress
        $progress = LessonProgress::firstOrCreate(
            [
                'user_id' => $user->id,
                'course_id' => $courseId,
                'content_id' => $lessonId
            ],
            [
                'started_at' => now()
            ]
        );

        // Get resources (documents) for this lesson
        $resources = Content::where('course_id', $courseId)
            ->where('type', 'document')
            ->where('order', $lesson->order) // Resources with same order as video
            ->where('is_published', true)
            ->get()
            ->map(function($resource) {
                return [
                    'id' => $resource->id,
                    'title' => $resource->title,
                    'description' => $resource->description,
                    'fileName' => $resource->file_name,
                    'fileSize' => $resource->formatted_size,
                    'fileUrl' => MediaUrl::url($resource->file_path),
                ];
            });

        $data = [
            'id' => $lesson->id,
            'title' => $lesson->title,
            'description' => $lesson->description,
            'type' => $lesson->type,
            'order' => $lesson->order,
            'duration' => $lesson->duration,
            'fileUrl' => $lesson->type === 'video' && $lesson->file_path
                ? MediaUrl::contentStreamPath($lesson->id)
                : MediaUrl::url($lesson->file_path),
            'thumbnailUrl' => MediaUrl::url($lesson->thumbnail_path),
            'resources' => $resources,
            'progress' => [
                'percentage' => $progress->progress_percentage,
                'watchTime' => $progress->watch_time,
                'isCompleted' => $progress->is_completed,
                'startedAt' => $progress->started_at?->toISOString(),
                'completedAt' => $progress->completed_at?->toISOString(),
            ],
            'navigation' => [
                'previous' => $this->getPreviousLesson($lesson, $course),
                'next' => $this->getNextLesson($lesson, $course),
            ]
        ];

        // Update enrollment last accessed
        $enrollment->update(['last_accessed_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Update lesson progress
     */
    public function updateProgress(Request $request, $courseId, $lessonId)
    {
        $validator = Validator::make($request->all(), [
            'watch_time' => 'required|integer|min:0',
            'total_duration' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = auth()->user();

        // Verify enrollment
        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->firstOrFail();

        $progress = LessonProgress::firstOrCreate(
            [
                'user_id' => $user->id,
                'course_id' => $courseId,
                'content_id' => $lessonId,
            ],
            [
                'started_at' => now(),
            ]
        );

        $progress->updateWatchTime(
            $request->watch_time,
            $request->total_duration
        );

        // Auto-fill video lesson duration if it is not set or empty
        $lesson = $progress->content;
        if ($lesson && ($lesson->duration === null || $lesson->duration === '' || $lesson->duration === '—')) {
            if ($request->total_duration && $request->total_duration > 0) {
                $minutes = (int) max(1, round($request->total_duration / 60));
                $lesson->update(['duration' => $minutes . ' mins']);
            }
        }

        // Recalculate course progress
        $courseProgress = $this->calculateCourseProgress($courseId, $user->id);
        
        // Update enrollment
        $enrollment->update([
            'progress_percentage' => $courseProgress,
            'status' => $courseProgress >= 100 ? 'completed' : 'in_progress'
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'progress_percentage' => $progress->progress_percentage,
                'is_completed' => $progress->is_completed,
                'course_progress' => $courseProgress
            ]
        ]);
    }

    /**
     * Mark lesson as complete
     */
    public function completeLesson($courseId, $lessonId)
    {
        $user = auth()->user();

        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->firstOrFail();

        $progress = LessonProgress::firstOrCreate(
            [
                'user_id' => $user->id,
                'course_id' => $courseId,
                'content_id' => $lessonId,
            ],
            [
                'started_at' => now(),
            ]
        );

        if (!$progress->is_completed) {
            $progress->markAsCompleted();
        }

        // Recalculate course progress
        $courseProgress = $this->calculateCourseProgress($courseId, $user->id);
        
        // Update enrollment
        $enrollment->update([
            'progress_percentage' => $courseProgress,
            'status' => $courseProgress >= 100 ? 'completed' : 'in_progress',
            'completed_at' => $courseProgress >= 100 ? now() : null
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lesson marked as complete',
            'data' => [
                'course_progress' => $courseProgress,
                'is_course_completed' => $courseProgress >= 100
            ]
        ]);
    }

    // Helper methods
    private function transformCourseForLearner($course, $userId)
    {
        $enrollment = $course->enrollments()->where('user_id', $userId)->first();
        $videoCount = $course->contents()
            ->where('type', 'video')
            ->where('is_published', true)
            ->count();
        $documentCount = $course->contents()
            ->whereIn('type', ['document', 'image'])
            ->where('is_published', true)
            ->count();
        $totalLessons = CourseProgressCalculator::totalTrackable($course->id);
        $moduleCount = $course->relationLoaded('modules')
            ? $course->modules->count()
            : $course->modules()->where('is_published', true)->count();
        
        // Calculate actual progress
        $progress = $this->calculateCourseProgress($course->id, $userId);
        
        return [
            'id' => $course->id,
            'title' => $course->title,
            'description' => $course->description,
            'thumbnailUrl' => $this->courseThumbnailUrl($course),
            'instructor' => [
                'id' => $course->user->id,
                'name' => $course->user->name,
            ],
            'stats' => [
                'totalLessons' => $totalLessons,
                'videoCount' => $videoCount,
                'documentCount' => $documentCount,
                'moduleCount' => $moduleCount,
                'totalEnrollments' => $course->enrollments()->count(),
            ],
            'isEnrolled' => $enrollment !== null,
            'progress' => $progress,
            'createdAt' => $course->created_at->toISOString(),
        ];
    }

    /**
     * Calculate course progress from completed published content (video, document, image).
     */
    private function calculateCourseProgress($courseId, $userId)
    {
        return CourseProgressCalculator::percentage((int) $courseId, (int) $userId);
    }

    private function orderedPublishedVideos(Course $course)
    {
        return Content::query()
            ->from('contents')
            ->join('course_modules', 'contents.module_id', '=', 'course_modules.id')
            ->where('contents.course_id', $course->id)
            ->where('contents.type', 'video')
            ->where('contents.is_published', true)
            ->whereNotNull('contents.module_id')
            ->where('course_modules.is_published', true)
            ->orderBy('course_modules.order')
            ->orderBy('contents.order')
            ->orderBy('contents.id')
            ->select('contents.*')
            ->get();
    }

    private function isLessonUnlocked($lesson, $course, $userId, $orderedVideos = null)
    {
        // Documents / images are always unlocked
        if (in_array($lesson->type, ['document', 'image'], true)) {
            return true;
        }

        // Completed lessons stay accessible for review even if sequence changed.
        $alreadyCompleted = LessonProgress::where('user_id', $userId)
            ->where('content_id', $lesson->id)
            ->where('is_completed', true)
            ->exists();
        if ($alreadyCompleted) {
            return true;
        }

        $orderedVideos = $orderedVideos ?? $this->orderedPublishedVideos($course);
        if ($orderedVideos->isEmpty()) {
            return true;
        }

        $index = $orderedVideos->search(fn ($v) => (int) $v->id === (int) $lesson->id);
        if ($index === false) {
            // Not in published video sequence — allow access if published content
            return true;
        }

        if ($index === 0) {
            return true;
        }

        $previous = $orderedVideos[$index - 1];

        return LessonProgress::where('user_id', $userId)
            ->where('content_id', $previous->id)
            ->where('is_completed', true)
            ->exists();
    }

    private function getPreviousLesson($lesson, $course)
    {
        $ordered = $this->orderedPublishedVideos($course);
        $index = $ordered->search(fn ($v) => (int) $v->id === (int) $lesson->id);
        if ($index === false || $index === 0) {
            return null;
        }
        $previous = $ordered[$index - 1];
        return [
            'id' => $previous->id,
            'title' => $previous->title,
            'order' => $previous->order,
            'moduleId' => $previous->module_id,
        ];
    }

    private function getNextLesson($lesson, $course)
    {
        $ordered = $this->orderedPublishedVideos($course);
        $index = $ordered->search(fn ($v) => (int) $v->id === (int) $lesson->id);
        if ($index === false || $index >= $ordered->count() - 1) {
            return null;
        }
        $next = $ordered[$index + 1];
        return [
            'id' => $next->id,
            'title' => $next->title,
            'order' => $next->order,
            'moduleId' => $next->module_id,
        ];
    }

    private function courseThumbnailUrl(Course $course): ?string
    {
        if ($course->thumbnail_path) {
            return MediaUrl::url($course->thumbnail_path);
        }

        $firstVideoThumb = Content::where('course_id', $course->id)
            ->where('type', 'video')
            ->where('is_published', true)
            ->whereNotNull('thumbnail_path')
            ->orderBy('order')
            ->value('thumbnail_path');

        return MediaUrl::url($firstVideoThumb);
    }
}