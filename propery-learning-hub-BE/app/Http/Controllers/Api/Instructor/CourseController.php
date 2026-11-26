<?php

namespace App\Http\Controllers\Api\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Support\MediaStorage;
use App\Support\MediaUploadPath;
use App\Support\MediaUrl;
use App\Support\ContentMetrics;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CourseController extends Controller
{
    private function publicUrl(?string $path): ?string
    {
        return MediaUrl::url($path);
    }

    /**
     * Get all courses for authenticated user
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = Course::with(['contents' => function($q) {
                $q->select('id', 'course_id', 'title', 'type', 'is_published')
                  ->orderBy('order');
            }])
            ->withCount(['modules', 'enrollments']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        // Search
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        // Sorting
        $sort = $request->get('sort', 'order');
        $order = $request->get('order', 'asc');

        if (!in_array($sort, ['title', 'created_at', 'updated_at', 'order'], true)) {
            $sort = 'order';
        }

        $query->orderBy($sort, $order === 'desc' ? 'desc' : 'asc');
        if ($sort !== 'id') {
            $query->orderBy('id');
        }

        $courses = $query->get()->map(fn ($course) => $this->transformCourse($course));

        return response()->json([
            'success' => true,
            'data' => $courses,
            'meta' => [
                'content_stats' => ContentMetrics::counts($user),
            ],
        ]);
    }

    /**
     * Get single course
     */
    public function show($id)
    {
        $course = Course::with([
            'contents' => function ($q) {
                $q->orderBy('order');
            },
            'modules' => function ($q) {
                $q->orderBy('order')->with(['contents' => fn ($cq) => $cq->orderBy('order')]);
            },
        ]);

        if (!auth()->user()->isAdmin()) {
            $course->where('user_id', auth()->id());
        }

        $course = $course->findOrFail($id);
        $course->ensureDefaultModule();
        $course->load(['modules' => fn ($q) => $q->orderBy('order')->with(['contents' => fn ($cq) => $cq->orderBy('order')])]);

        return response()->json([
            'success' => true,
            'data' => $this->transformCourse($course, true)
        ]);
    }

    /**
     * Create new course
     */
    public function store(Request $request)
    {
        if ($uploadError = $this->uploadFailureResponse($request)) {
            return $uploadError;
        }

        $request->merge([
            'title' => trim((string) $request->input('title', '')),
            'description' => trim((string) $request->input('description', '')),
        ]);

        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'thumbnail_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail_path' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        $thumbnailPath = $this->resolveCourseThumbnail($request);
        if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
            return $thumbnailPath;
        }

        $maxOrder = Course::max('order') ?? 0;

        $course = Course::create([
            'title'          => $request->title,
            'slug'           => Str::slug($request->title) . '-' . Str::random(6),
            'description'    => $request->description ?? '',
            'user_id'        => auth()->id(),
            'thumbnail_path' => $thumbnailPath,
            'is_active'      => true,
            'order'          => $maxOrder + 1,
        ]);

        $course->ensureDefaultModule();

        return response()->json([
            'success' => true,
            'message' => 'Course created successfully',
            'data'    => $this->transformCourse($course->fresh(['modules', 'contents']))
        ], 201);
    }

    /**
     * Update course
     */
    public function update(Request $request, $id)
    {
        if ($uploadError = $this->uploadFailureResponse($request)) {
            return $uploadError;
        }

        $request->merge([
            'title' => trim((string) $request->input('title', '')),
            'description' => trim((string) $request->input('description', '')),
        ]);

        $course = Course::query();
        if (!auth()->user()->isAdmin()) {
            $course->where('user_id', auth()->id());
        }
        $course = $course->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'thumbnail_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail_path' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        if ($request->filled('thumbnail_path') || $request->hasFile('thumbnail_image') || $request->hasFile('thumbnail')) {
            $thumbnailPath = $this->resolveCourseThumbnail($request);
            if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
                return $thumbnailPath;
            }

            $previousThumbnail = $course->thumbnail_path;

            $course->update([
                'title'         => $request->title,
                'slug'          => Str::slug($request->title) . '-' . Str::random(6),
                'description'   => $request->description ?? '',
                'thumbnail_path'=> $thumbnailPath,
                'updated_at'    => now(),
            ]);

            if ($previousThumbnail && $previousThumbnail !== $thumbnailPath) {
                MediaStorage::delete($previousThumbnail);
            }
        } else {
            $course->update([
                'title'       => $request->title,
                'slug'        => Str::slug($request->title) . '-' . Str::random(6),
                'description' => $request->description ?? '',
                'updated_at'  => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Course updated successfully',
            'data'    => $this->transformCourse($course->fresh())
        ]);
    }

    /**
     * Delete course
     */
    public function destroy($id)
    {
        try {
            $course = Course::query();
            if (!auth()->user()->isAdmin()) {
                $course->where('user_id', auth()->id());
            }
            $course = $course->findOrFail($id);

            // Best-effort thumbnail cleanup — never block course deletion
            if ($course->thumbnail_path) {
                try {
                    MediaStorage::delete($course->thumbnail_path);
                } catch (\Throwable $e) {
                    \Log::warning('Course thumbnail could not be deleted during course removal', [
                        'course_id' => $course->id,
                        'thumbnail_path' => $course->thumbnail_path,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Detach content from course/modules (keep files as uncategorized)
            $course->contents()->update([
                'course_id' => null,
                'module_id' => null,
                'order' => 0,
            ]);

            // Remove module progress + modules before deleting the course
            \App\Models\ModuleProgress::where('course_id', $course->id)->delete();
            foreach ($course->modules()->get(['id', 'thumbnail_path']) as $module) {
                if ($module->thumbnail_path) {
                    try {
                        MediaStorage::delete($module->thumbnail_path);
                    } catch (\Throwable $e) {
                        \Log::warning('Module thumbnail could not be deleted during course removal', [
                            'module_id' => $module->id,
                            'thumbnail_path' => $module->thumbnail_path,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
            $course->modules()->delete();

            // Clean related progress/enrollments (in case FK cascade is unavailable)
            \App\Models\LessonProgress::where('course_id', $course->id)->delete();
            CourseEnrollment::where('course_id', $course->id)->delete();

            $course->delete();

            return response()->json([
                'success' => true,
                'message' => 'Course deleted successfully',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Course not found',
            ], 404);
        } catch (\Throwable $e) {
            \Log::error('Failed to delete course: ' . $e->getMessage(), [
                'course_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete course: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get course contents
     */
    public function getContents($id, Request $request)
    {
        $course = Course::query();
        if (!auth()->user()->isAdmin()) {
            $course->where('user_id', auth()->id());
        }
        $course = $course->findOrFail($id);

        $query = $course->contents();

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $contents = $query->get()->map(function ($content) {
            return [
                'id'          => $content->id,
                'title'       => $content->title,
                'description' => $content->description,
                'type'        => $content->type,
                'order'       => $content->order,
                'published'   => $content->is_published,
                'views'       => $content->views,
                'downloads'   => $content->downloads,
                'fileUrl'     => MediaUrl::url($content->file_path),
                'thumbnailUrl'=> MediaUrl::url($content->thumbnail_path),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $contents
        ]);
    }

    /**
     * Reorder course contents
     */
    public function reorderContents(Request $request, $id)
    {
        $course = Course::query();
        if (!auth()->user()->isAdmin()) {
            $course->where('user_id', auth()->id());
        }
        $course = $course->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'content_ids' => 'required|array',
            'content_ids.*' => 'exists:contents,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        $course->reorderContents($request->content_ids);

        return response()->json([
            'success' => true,
            'message' => 'Contents reordered successfully'
        ]);
    }

    /**
     * Course statistics for admin/instructor dashboard
     */
    public function getStatistics($id)
    {
        $query = Course::with(['modules', 'contents', 'enrollments']);
        if (!auth()->user()->isAdmin()) {
            $query->where('user_id', auth()->id());
        }
        $course = $query->findOrFail($id);

        $publishedContents = $course->contents->where('is_published', true);
        $enrollments = $course->enrollments;

        return response()->json([
            'success' => true,
            'data' => [
                'courseId' => $course->id,
                'title' => $course->title,
                'moduleCount' => $course->modules->count(),
                'contentCount' => $publishedContents->count(),
                'videoCount' => $publishedContents->where('type', 'video')->count(),
                'documentCount' => $publishedContents->whereIn('type', ['document', 'image'])->count(),
                'enrollmentCount' => $enrollments->count(),
                'completedCount' => $enrollments->where('status', 'completed')->count(),
                'inProgressCount' => $enrollments->where('status', 'in_progress')->count(),
                'averageProgress' => (int) round($enrollments->avg('progress_percentage') ?? 0),
            ],
        ]);
    }

    /**
     * Reorder courses (admin/instructor list order)
     */
    public function reorderCourses(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'course_ids' => 'required|array|min:1',
            'course_ids.*' => 'integer|exists:courses,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = auth()->user();
        $ids = array_map('intval', $request->course_ids);

        $query = Course::query()->whereIn('id', $ids);
        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }
        $owned = $query->pluck('id')->map(fn ($id) => (int) $id)->all();

        if (count($owned) !== count($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'One or more courses were not found or are not owned by you.',
            ], 422);
        }

        foreach ($ids as $index => $courseId) {
            Course::where('id', $courseId)->update(['order' => $index + 1]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Courses reordered successfully',
        ]);
    }

    /**
     * Transform course data
     */
    private function transformCourse(Course $course, $detailed = false)
    {
        $videoCount = $course->relationLoaded('contents')
            ? $course->contents->where('type', 'video')->count()
            : $course->videos()->count();
        $documentCount = $course->relationLoaded('contents')
            ? $course->contents->whereIn('type', ['document', 'image'])->count()
            : $course->documents()->count();

        $moduleCount = isset($course->modules_count)
            ? (int) $course->modules_count
            : ($course->relationLoaded('modules')
                ? $course->modules->count()
                : $course->modules()->count());

        $enrollmentCount = isset($course->enrollments_count)
            ? (int) $course->enrollments_count
            : ($course->relationLoaded('enrollments')
                ? $course->enrollments->count()
                : null);

        $data = [
            'id'             => $course->id,
            'title'          => $course->title,
            'description'    => $course->description,
            'thumbnailUrl'   => $this->courseThumbnailUrl($course),
            'thumbnailPath'  => $course->thumbnail_path,
            'order'          => $course->order,
            'contentCount'   => $videoCount + $documentCount,
            'videoCount'     => $videoCount,
            'documentCount'  => $documentCount,
            'moduleCount'    => $moduleCount,
            'isActive'       => $course->is_active,
            'createdAt'      => $course->created_at->toISOString(),
            'updatedAt'      => $course->updated_at->toISOString(),
        ];

        if ($enrollmentCount !== null) {
            $data['enrollmentCount'] = $enrollmentCount;
        }

        if ($detailed) {
            if (!$course->relationLoaded('modules')) {
                $course->load(['modules' => fn ($q) => $q->orderBy('order')->with(['contents' => fn ($cq) => $cq->orderBy('order')])]);
            }

            $data['modules'] = $course->modules->map(function ($module) {
                return [
                    'id' => $module->id,
                    'title' => $module->title,
                    'description' => $module->description,
                    'thumbnailUrl' => $this->publicUrl($module->thumbnail_path),
                    'thumbnailPath' => $module->thumbnail_path,
                    'order' => $module->order,
                    'isPublished' => $module->is_published,
                    'contentCount' => $module->contents->count(),
                    'contents' => $module->contents->map(function ($content) {
                        return [
                            'id' => $content->id,
                            'title' => $content->title,
                            'description' => $content->description,
                            'type' => $content->type,
                            'order' => $content->order,
                            'published' => $content->is_published,
                            'moduleId' => $content->module_id,
                            'thumbnailUrl' => $this->publicUrl($content->thumbnail_path),
                        ];
                    })->values(),
                ];
            })->values();

            $data['contents'] = $course->relationLoaded('contents')
                ? $course->contents->map(function ($content) {
                    return [
                        'id'          => $content->id,
                        'title'       => $content->title,
                        'description' => $content->description,
                        'type'        => $content->type,
                        'order'       => $content->order,
                        'published'   => $content->is_published,
                        'moduleId'    => $content->module_id,
                        'thumbnailUrl'=> $this->publicUrl($content->thumbnail_path),
                    ];
                })
                : [];
        }

        return $data;
    }

    private function courseThumbnailUrl(Course $course): ?string
    {
        return $this->publicUrl($course->thumbnail_path);
    }

    private function resolveCourseThumbnail(Request $request): string|\Illuminate\Http\JsonResponse|null
    {
        if ($request->filled('thumbnail_path')) {
            $path = ltrim($request->string('thumbnail_path')->toString(), '/');

            if (!MediaUploadPath::isAllowedPath($path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid thumbnail path.',
                ], 422);
            }

            return $path;
        }

        if ($request->hasFile('thumbnail_image') || $request->hasFile('thumbnail')) {
            $file = $request->file('thumbnail_image') ?? $request->file('thumbnail');

            return MediaStorage::storeAs(
                'courses/thumbnails',
                Str::random(20) . '.' . $file->getClientOriginalExtension(),
                $file
            );
        }

        return null;
    }

    private function uploadFailureResponse(Request $request): ?\Illuminate\Http\JsonResponse
    {
        if ($request->hasFile('thumbnail_image') || $request->hasFile('thumbnail')) {
            return null;
        }

        $contentLength = (int) $request->server('CONTENT_LENGTH', 0);
        if ($contentLength <= 0) {
            return null;
        }

        $postMaxBytes = $this->parseIniSize(ini_get('post_max_size'));
        $uploadMaxBytes = $this->parseIniSize(ini_get('upload_max_filesize'));
        $serverLimit = min($postMaxBytes, $uploadMaxBytes);

        if ($serverLimit <= 0 || $contentLength <= $serverLimit) {
            return null;
        }

        $serverLimitLabel = $this->formatBytes($serverLimit);

        return response()->json([
            'success' => false,
            'message' => "Upload failed: file exceeds the server limit of {$serverLimitLabel}.",
            'errors'  => [
                'thumbnail_image' => ["The thumbnail is too large for the server (max {$serverLimitLabel})."],
            ],
        ], 413);
    }

    private function parseIniSize(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return match ($unit) {
            'g' => (int) ($number * 1024 * 1024 * 1024),
            'm' => (int) ($number * 1024 * 1024),
            'k' => (int) ($number * 1024),
            default => (int) $number,
        };
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 1) . ' MB';
        }

        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }

        return $bytes . ' B';
    }
}