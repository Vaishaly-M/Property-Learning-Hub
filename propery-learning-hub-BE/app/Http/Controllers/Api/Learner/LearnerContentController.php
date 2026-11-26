<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\ContentCategory;
use App\Models\Course;
use App\Models\User;
use App\Models\CourseEnrollment;
use App\Models\LessonProgress;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;

class LearnerContentController extends Controller
{
    /**
     * Get all published content for learners
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        
        $query = Content::with(['category', 'user', 'course'])
            ->published()
            ->where('is_published', true);

        // Type filter
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Category filter
        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category_id', $request->category);
        }

        // Course filter
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        // Filter content without course
        if ($request->boolean('without_course')) {
            $query->whereNull('course_id');
        }

        // Search filter
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        // Level filter
        if ($request->filled('level') && $request->level !== 'all') {
            $query->whereJsonContains('metadata->difficulty', $request->level);
        }

        // Mentor filter
        if ($request->filled('mentor') && $request->mentor !== 'all') {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', $request->mentor);
            });
        }

        // Sorting
        $sortBy = $request->get('sort', 'newest');
        switch ($sortBy) {
            case 'newest':
                $query->orderBy('published_at', 'desc');
                break;
            case 'popular':
                $query->orderBy('views', 'desc');
                break;
            case 'recommended':
                $query->orderByRaw('(views * 0.3 + downloads * 0.7) DESC');
                break;
            case 'alphabetical':
                $query->orderBy('title', 'asc');
                break;
            case 'order':
                $query->orderBy('order', 'asc');
                break;
            default:
                $query->orderBy('published_at', 'desc');
        }

        $perPage = $request->get('per_page', 50);
        $content = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $content->map(fn ($item) => $this->transformForLearner($item)),
            'meta' => [
                'current_page' => $content->currentPage(),
                'last_page' => $content->lastPage(),
                'per_page' => $content->perPage(),
                'total' => $content->total(),
            ]
        ]);
    }

    /**
     * Get single content details
     */
    public function show($id)
    {
        $content = Content::with(['category', 'user', 'course'])
            ->published()
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->transformForLearner($content, true)
        ]);
    }

    /**
     * Get content categories
     */
    public function getCategories()
    {
        $categories = ContentCategory::active()
            ->withCount('contents')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'count' => $category->contents_count
                ];
            })
        ]);
    }

    /**
     * Get all unique mentors/instructors
     */
    public function getMentors()
    {
        $mentors = User::whereHas('contents', function ($query) {
            $query->published();
        })
        ->select('id', 'name', 'email')
        ->withCount(['contents' => function ($query) {
            $query->published();
        }])
        ->orderBy('name')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $mentors->map(function ($mentor) {
                return [
                    'id' => $mentor->id,
                    'name' => $mentor->name,
                    'photo' => $mentor->profile_photo_url ?? "https://i.pravatar.cc/150?u={$mentor->id}",
                    'courses_count' => $mentor->contents_count
                ];
            })
        ]);
    }

    /**
     * Get all courses with content counts and enrollment status
     */
    public function getCourses(Request $request)
    {
        $user = auth()->user();
        
        $query = Course::where('is_active', true);

        if ($request->filled('filter')) {
            if ($request->filter === 'enrolled') {
                $query->whereHas('enrollments', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } elseif ($request->filter === 'available') {
                $query->whereDoesntHave('enrollments', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            }
        }

        // Search
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort', 'newest');
        switch ($sortBy) {
            case 'newest':
                $query->orderBy('created_at', 'desc');
                break;
            case 'alphabetical':
                $query->orderBy('title', 'asc');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        $courses = $query->get();

        // Get content counts for each course
        $coursesWithCounts = $courses->map(function ($course) use ($user) {
            $videoCount = Content::where('course_id', $course->id)
                ->where('type', 'video')
                ->where('is_published', true)
                ->count();
            
            $documentCount = Content::where('course_id', $course->id)
                ->where('type', 'document')
                ->where('is_published', true)
                ->count();
            
            // Check if user is enrolled
            $enrollment = CourseEnrollment::where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->first();
            
            // Calculate progress based on completed videos
            $progress = 0;
            if ($enrollment) {
                $completedVideos = LessonProgress::where('user_id', $user->id)
                    ->where('course_id', $course->id)
                    ->where('is_completed', true)
                    ->whereHas('content', function($q) {
                        $q->where('type', 'video');
                    })
                    ->count();
                
                if ($videoCount > 0) {
                    $progress = round(($completedVideos / $videoCount) * 100);
                }
            }
            
            $isEnrolled = $enrollment !== null;
            $enrollmentStatus = $enrollment ? [
                'id' => $enrollment->id,
                'status' => $enrollment->status,
                'progress' => $progress,
                'enrolledAt' => $enrollment->enrolled_at->toISOString(),
                'lastAccessedAt' => $enrollment->last_accessed_at?->toISOString(),
                'completedAt' => $enrollment->completed_at?->toISOString(),
            ] : null;

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
                    'totalLessons' => $videoCount + $documentCount,
                    'videoCount' => $videoCount,
                    'documentCount' => $documentCount,
                    'totalEnrollments' => $course->enrollments()->count(),
                ],
                'isEnrolled' => $isEnrolled,
                'progress' => $progress,
                'enrollment' => $enrollmentStatus,
                'createdAt' => $course->created_at->toISOString(),
                'updatedAt' => $course->updated_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $coursesWithCounts
        ]);
    }

    /**
     * Get single course with all contents (videos and documents separately)
     */
    public function getCourse($id)
    {
        $user = auth()->user();
        
        $courseQuery = Course::query();
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $courseQuery->where('is_active', true);
        }
        $course = $courseQuery->findOrFail($id);

        // Check enrollment status
        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();
        
        $isEnrolled = $enrollment !== null;

        // Get lesson progress for this user
        $lessonProgress = LessonProgress::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->pluck('is_completed', 'content_id')
            ->toArray();

        // Get videos with completion status
        $videosQuery = Content::where('course_id', $course->id)
            ->where('type', 'video');
        
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $videosQuery->where('is_published', true);
        }
        
        $videos = $videosQuery->orderBy('order')
            ->get()
            ->map(function ($item) use ($lessonProgress, $user, $course) {
                $data = $this->transformForLearner($item);
                
                // Add completion status
                $data['isCompleted'] = $lessonProgress[$item->id] ?? false;
                
                // Check if unlocked (first video or previous video is completed)
                $data['isUnlocked'] = $this->isLessonUnlocked($item, $course, $user->id);
                
                // Get progress details
                $progress = LessonProgress::where('user_id', $user->id)
                    ->where('content_id', $item->id)
                    ->first();
                
                if ($progress) {
                    $data['progress'] = [
                        'percentage' => $progress->progress_percentage,
                        'watchTime' => $progress->watch_time,
                    ];
                }
                
                return $data;
            });

        // Get documents
        $documentsQuery = Content::where('course_id', $course->id)
            ->where('type', 'document');
            
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $documentsQuery->where('is_published', true);
        }
        
        $documents = $documentsQuery->orderBy('order')
            ->get()
            ->map(fn ($item) => $this->transformForLearner($item));

        // Calculate actual progress based on completed videos
        $totalVideos = $videos->count();
        $completedVideos = $videos->filter(fn($v) => $v['isCompleted'])->count();
        $actualProgress = $totalVideos > 0 ? round(($completedVideos / $totalVideos) * 100) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'thumbnailUrl' => $this->courseThumbnailUrl($course),
                'instructor' => [
                    'id' => $course->user->id,
                    'name' => $course->user->name,
                ],
                'stats' => [
                    'videoCount' => $videos->count(),
                    'documentCount' => $documents->count(),
                    'totalLessons' => $videos->count() + $documents->count(),
                    'totalEnrollments' => $course->enrollments()->count(),
                ],
                'isEnrolled' => $isEnrolled,
                'progress' => $actualProgress,
                'enrollment' => $enrollment ? [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status,
                    'progress' => $actualProgress,
                    'enrolledAt' => $enrollment->enrolled_at->toISOString(),
                    'lastAccessedAt' => $enrollment->last_accessed_at?->toISOString(),
                    'completedAt' => $enrollment->completed_at?->toISOString(),
                ] : null,
                'videos' => $videos,
                'documents' => $documents,
                'isActive' => $course->is_active,
                'createdAt' => $course->created_at->toISOString(),
                'updatedAt' => $course->updated_at->toISOString(),
            ]
        ]);
    }

    public function downloadResource($id)
    {
        $user = auth()->user();

        $contentQuery = Content::where('type', 'document');
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $contentQuery->published();
        }
        $content = $contentQuery->findOrFail($id);

        if (!MediaStorage::exists($content->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);
        }

        if (!$this->userCanAccessContent($user, $content)) {
            return response()->json([
                'success' => false,
                'message' => 'You must enroll in the course to download this resource',
            ], 403);
        }

        // Increment downloads (only if not admin/instructor)
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $content->incrementDownloads();
        }

        return response()->json([
            'success' => true,
            'file_name' => $content->file_name,
            'document_url' => url("/api/learner/content/{$id}/document"),
        ]);
    }

    /**
     * Stream document file for download (supports ?token= for direct links).
     */
    public function downloadDocument(Request $request, $id)
    {
        $user = $this->resolveStreamUser($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        auth()->setUser($user);

        $contentQuery = Content::where('type', 'document');
        if (!$user->isAdmin() && !$user->isInstructor()) {
            $contentQuery->published();
        }
        $content = $contentQuery->findOrFail($id);

        $this->ensureCourseEnrollment($user, $content);

        if (!$this->userCanAccessContent($user, $content)) {
            return response()->json([
                'success' => false,
                'message' => 'You must enroll in the course to download this resource',
            ], 403);
        }

        $storagePath = MediaStorage::normalizePath($content->file_path);
        if (!$storagePath || !MediaStorage::exists($storagePath)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found in storage. Please ask your instructor to re-upload this document.',
            ], 404);
        }

        if (!$request->boolean('inline')) {
            $content->incrementDownloads();
        }

        $name = $content->file_name ?: basename($storagePath);

        if (MediaStorage::usesCloud()) {
            $disposition = $request->boolean('inline') ? 'inline' : 'attachment';
            $safeName = str_replace('"', '\\"', $name);
            $signedUrl = MediaStorage::temporaryUrl(
                $storagePath,
                now()->addHours(2),
                false,
                ['ResponseContentDisposition' => "{$disposition}; filename=\"{$safeName}\""]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'download_url' => $signedUrl,
                    'file_name'    => $name,
                    'inline'       => $request->boolean('inline'),
                ],
            ]);
        }

        $disposition = $request->boolean('inline') ? 'inline' : 'attachment';

        return MediaStorage::inline(
            $storagePath,
            $name,
            MediaStorage::mimeType($storagePath),
            false,
            ['Content-Disposition' => $disposition . '; filename="' . str_replace('"', '\\"', $name) . '"']
        );
    }

    
    public function getVideoUrl($id)
    {
        $user = auth()->user();

        $contentQuery = Content::where('type', 'video');
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $contentQuery->published();
        }
        $content = $contentQuery->findOrFail($id);

        if (!MediaStorage::exists($content->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Video not found'
            ], 404);
        }

        // Check if user is enrolled in the course (if video belongs to a course)
        if ($content->course_id) {
            $enrollment = CourseEnrollment::where('user_id', auth()->id())
                ->where('course_id', $content->course_id)
                ->exists();
            
            if (!$enrollment) {
                // Bypass for admin/instructor
                if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must enroll in the course to watch this video'
                    ], 403);
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'video_url' => MediaUrl::playbackUrl($content->file_path),
                'thumbnail_url' => MediaUrl::url($content->thumbnail_path),
            ],
            'video_url' => MediaUrl::playbackUrl($content->file_path),
            'thumbnail_url' => MediaUrl::url($content->thumbnail_path),
        ]);
    }

    /**
     * Stream video file for in-browser playback (supports range requests).
     * Accepts Bearer auth or ?token= for HTML5 video elements.
     */
    public function streamVideo(Request $request, $id)
    {
        $user = $this->resolveStreamUser($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        auth()->setUser($user);

        $contentQuery = Content::where('type', 'video');
        if (!$user->isAdmin() && !$user->isInstructor()) {
            $contentQuery->published();
        }
        $content = $contentQuery->findOrFail($id);

        if ($content->course_id) {
            $enrolled = CourseEnrollment::where('user_id', $user->id)
                ->where('course_id', $content->course_id)
                ->exists();

            if (!$enrolled) {
                // Bypass for admin/instructor
                if (!$user->isAdmin() && !$user->isInstructor()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must enroll in the course to watch this video',
                    ], 403);
                }
            }
        }

        if (!$content->file_path || !MediaStorage::exists($content->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Video not found',
            ], 404);
        }

        return MediaStorage::streamVideo($content->file_path);
    }

    private function userCanAccessContent(User $user, Content $content): bool
    {
        if ($user->isAdmin() || $user->isInstructor()) {
            return true;
        }

        if ((int) $content->user_id === (int) $user->id) {
            return true;
        }

        if (!$content->course_id) {
            return true;
        }

        return CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $content->course_id)
            ->exists();
    }

    private function resolveStreamUser(Request $request): ?User
    {
        if ($user = auth('sanctum')->user()) {
            return $user;
        }

        $token = $request->bearerToken() ?? $request->query('token');
        if (!$token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);

        return $accessToken?->tokenable;
    }

    private function ensureCourseEnrollment(User $user, Content $content): void
    {
        if ($user->isAdmin() || $user->isInstructor()) {
            return;
        }
        if (!$content->course_id) {
            return;
        }

        $course = Course::where('id', $content->course_id)
            ->where('is_active', true)
            ->first();

        if ($course) {
            $course->enrollUser($user->id);
        }
    }

    /**
     * Record view
     */
    public function recordView($id)
    {
        $user = auth()->user();
        
        $contentQuery = Content::query();
        if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
            $contentQuery->published();
        }
        $content = $contentQuery->findOrFail($id);

        // Check if user is enrolled in the course (if content belongs to a course)
        if ($content->course_id) {
            $enrollment = CourseEnrollment::where('user_id', auth()->id())
                ->where('course_id', $content->course_id)
                ->exists();
            
            if (!$enrollment) {
                // Bypass for admin/instructor
                if (!$user || (!$user->isAdmin() && !$user->isInstructor())) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must enroll in the course to view this content'
                    ], 403);
                }
            }
        }

        // Bypassed for admin/instructor previewing
        if ($user && ($user->isAdmin() || $user->isInstructor())) {
            if ($content->type === 'video') {
                return $this->getVideoUrl($id);
            }
            return response()->json([
                'success' => true,
                'message' => 'View bypassed for preview'
            ]);
        }

        $userId = auth()->id();
        $cacheKey = "content_view:{$userId}:{$content->id}";

        if (!Cache::has($cacheKey)) {
            $content->incrementViews();
            Cache::put($cacheKey, true, now()->addDay());
        }

        if ($content->type === 'video') {
            return $this->getVideoUrl($id);
        }

        return response()->json([
            'success' => true,
            'message' => 'View recorded'
        ]);
    }

    /**
     * Get learning statistics
     */
    public function getStats()
    {
        $stats = [
            'total_videos' => Content::published()->where('type', 'video')->count(),
            'total_resources' => Content::published()->where('type', 'document')->count(),
            'total_categories' => ContentCategory::active()->count(),
            'total_instructors' => User::whereHas('contents', function ($query) {
                $query->published();
            })->count(),
            'total_courses' => Course::where('is_active', true)->count(),
            'popular_categories' => ContentCategory::active()
                ->withCount(['contents' => function ($query) {
                    $query->published();
                }])
                ->orderBy('contents_count', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($cat) {
                    return [
                        'name' => $cat->name,
                        'count' => $cat->contents_count
                    ];
                })
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /* =========================================================
        HELPER METHODS
    ========================================================= */

    private function transformForLearner(Content $content, $detailed = false)
    {
        $base = [
            'id' => $content->id,
            'title' => $content->title,
            'description' => $content->description,
            'type' => $content->type,
            'category' => [
                'id' => optional($content->category)->id,
                'name' => optional($content->category)->name,
                'slug' => optional($content->category)->slug,
            ],
            'mentor' => [
                'id' => optional($content->user)->id,
                'name' => optional($content->user)->name,
                'photo' => optional($content->user)->profile_photo_url ?? "https://i.pravatar.cc/150?u={$content->user_id}",
            ],
            'course_id' => $content->course_id,
            'order' => $content->order,
            'duration' => $content->duration,
            'views' => $content->views,
            'downloads' => $content->downloads,
            'rating' => $content->metadata['rating'] ?? null,
            'reviews' => $content->metadata['reviews'] ?? 0,
            'difficulty' => $content->metadata['difficulty'] ?? null,
            'lessons' => $content->metadata['lessons'] ?? 1,
            'thumbnail' => MediaUrl::url($content->thumbnail_path) ?? $this->getDefaultThumbnail($content->type),
            'thumbnail_path' => $content->thumbnail_path,
            'has_custom_thumbnail' => !empty($content->thumbnail_path),
            'published_at' => $content->published_at?->format('Y-m-d'),
            'file_size' => $content->formatted_size,
            'file_name' => $content->file_name,
            'has_file' => !empty($content->file_path),
            'file_path' => $content->file_path,
            'video_url' => $content->type === 'video' && $content->file_path
                ? MediaUrl::contentStreamPath($content->id)
                : null,
        ];

        if ($detailed) {
            $base['metadata'] = $content->metadata;
        }

        if ($content->type === 'document') {
            $base['resource_type'] = $this->getResourceType($content->file_name);
        }

        return $base;
    }

    private function isLessonUnlocked($lesson, $course, $userId)
    {
        // Only videos need to be unlocked sequentially
        if ($lesson->type !== 'video') {
            return true;
        }

        $alreadyCompleted = LessonProgress::where('user_id', $userId)
            ->where('content_id', $lesson->id)
            ->where('is_completed', true)
            ->exists();
        if ($alreadyCompleted) {
            return true;
        }

        // First lesson is always unlocked
        if ($lesson->order === 0 || $lesson->order === 1) {
            return true;
        }

        // Get previous video lesson
        $previousLesson = Content::where('course_id', $course->id)
            ->where('type', 'video')
            ->where('order', '<', $lesson->order)
            ->where('is_published', true)
            ->orderBy('order', 'desc')
            ->first();

        if (!$previousLesson) {
            return true;
        }

        // Check if previous lesson is completed
        $previousProgress = LessonProgress::where('user_id', $userId)
            ->where('content_id', $previousLesson->id)
            ->where('is_completed', true)
            ->exists();

        return $previousProgress;
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

    private function getDefaultThumbnail($type)
    {
        $thumbnails = [
            'video' => 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop',
            'document' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
            'course' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop'
        ];

        return $thumbnails[$type] ?? $thumbnails['video'];
    }

    private function getResourceType($fileName)
    {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        $typeMap = [
            'pdf' => 'pdf',
            'doc' => 'template',
            'docx' => 'template',
            'xls' => 'spreadsheet',
            'xlsx' => 'spreadsheet',
            'csv' => 'spreadsheet',
        ];

        return $typeMap[$extension] ?? 'document';
    }
}