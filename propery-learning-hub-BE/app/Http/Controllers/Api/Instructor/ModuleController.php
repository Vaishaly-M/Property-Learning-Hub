<?php

namespace App\Http\Controllers\Api\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseModule;
use App\Models\LessonProgress;
use App\Models\ModuleProgress;
use App\Support\CourseProgressCalculator;
use App\Support\MediaStorage;
use App\Support\MediaUploadPath;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ModuleController extends Controller
{
    private function ownedCourseQuery()
    {
        $query = Course::query();
        if (!auth()->user()->isAdmin()) {
            $query->where('user_id', auth()->id());
        }
        return $query;
    }

    private function findOwnedCourse($courseId): Course
    {
        return $this->ownedCourseQuery()->findOrFail($courseId);
    }

    public function index($courseId)
    {
        $course = $this->findOwnedCourse($courseId);

        $modules = $course->modules()
            ->with(['contents' => fn ($q) => $q->orderBy('order')])
            ->withCount('contents')
            ->orderBy('order')
            ->get()
            ->map(fn (CourseModule $module) => $this->transformModule($module, false));

        return response()->json([
            'success' => true,
            'data' => $modules,
        ]);
    }

    public function store(Request $request, $courseId)
    {
        $course = $this->findOwnedCourse($courseId);

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_published' => 'boolean',
            'thumbnail_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail_path' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $thumbnailPath = $this->resolveModuleThumbnail($request);
        if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
            return $thumbnailPath;
        }

        $order = ($course->modules()->max('order') ?? 0) + 1;
        $baseSlug = Str::slug($request->title) ?: 'module';
        $slug = $baseSlug;
        $i = 1;
        while ($course->modules()->where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        $module = $course->modules()->create([
            'title' => $request->title,
            'slug' => $slug,
            'description' => $request->input('description'),
            'thumbnail_path' => $thumbnailPath,
            'order' => $order,
            'is_published' => $request->boolean('is_published', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Module created successfully',
            'data' => $this->transformModule($module->fresh()->load('contents')),
        ], 201);
    }

    public function update(Request $request, $courseId, $moduleId)
    {
        $course = $this->findOwnedCourse($courseId);
        $module = $course->modules()->where('id', $moduleId)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_published' => 'boolean',
            'thumbnail_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'thumbnail_path' => 'nullable|string|max:500',
            'remove_thumbnail' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $baseSlug = Str::slug($request->title) ?: 'module';
        $slug = $baseSlug;
        $i = 1;
        while (
            $course->modules()
                ->where('slug', $slug)
                ->where('id', '!=', $module->id)
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $i++;
        }

        $payload = [
            'title' => $request->title,
            'slug' => $slug,
            'description' => $request->input('description'),
            'is_published' => $request->boolean('is_published', $module->is_published),
        ];

        $previousThumbnail = $module->thumbnail_path;

        if ($request->boolean('remove_thumbnail')) {
            $payload['thumbnail_path'] = null;
        } elseif ($request->filled('thumbnail_path') || $request->hasFile('thumbnail_image') || $request->hasFile('thumbnail')) {
            $thumbnailPath = $this->resolveModuleThumbnail($request);
            if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
                return $thumbnailPath;
            }
            $payload['thumbnail_path'] = $thumbnailPath;
        }

        $module->update($payload);

        if (
            $previousThumbnail
            && array_key_exists('thumbnail_path', $payload)
            && $previousThumbnail !== ($payload['thumbnail_path'] ?? null)
        ) {
            MediaStorage::delete($previousThumbnail);
        }

        return response()->json([
            'success' => true,
            'message' => 'Module updated successfully',
            'data' => $this->transformModule($module->fresh()->load('contents'), true),
        ]);
    }

    public function destroy($courseId, $moduleId)
    {
        $course = $this->findOwnedCourse($courseId);
        $module = $course->modules()->where('id', $moduleId)->firstOrFail();

        if ($course->modules()->count() <= 1) {
            return response()->json([
                'success' => false,
                'message' => 'A course must have at least one module. Create another module before deleting this one.',
            ], 422);
        }

        // Move contents to the first remaining module
        $fallback = $course->modules()->where('id', '!=', $module->id)->orderBy('order')->first();
        $nextOrder = ($fallback->contents()->max('order') ?? 0) + 1;

        foreach ($module->contents()->orderBy('order')->get() as $content) {
            $content->update([
                'module_id' => $fallback->id,
                'course_id' => $course->id,
                'order' => $nextOrder++,
            ]);
        }

        $thumbnailPath = $module->thumbnail_path;
        $module->delete();

        if ($thumbnailPath) {
            MediaStorage::delete($thumbnailPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Module deleted. Its content was moved to "' . $fallback->title . '".',
        ]);
    }

    public function reorder(Request $request, $courseId)
    {
        $course = $this->findOwnedCourse($courseId);

        $validator = Validator::make($request->all(), [
            'module_ids' => 'required|array|min:1',
            'module_ids.*' => 'integer|exists:course_modules,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $ids = array_map('intval', $request->module_ids);
        $owned = $course->modules()->whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $submitted = collect($ids)->sort()->values()->all();

        if ($owned !== $submitted || count($ids) !== $course->modules()->count()) {
            return response()->json([
                'success' => false,
                'message' => 'Include every module in this course when reordering.',
            ], 422);
        }

        $course->reorderModules($ids);

        return response()->json([
            'success' => true,
            'message' => 'Modules reordered successfully',
        ]);
    }

    public function reorderContents(Request $request, $courseId, $moduleId)
    {
        $course = $this->findOwnedCourse($courseId);
        $module = $course->modules()->where('id', $moduleId)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'content_ids' => 'required|array',
            'content_ids.*' => 'integer|exists:contents,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $ids = array_map('intval', $request->content_ids);
        $ownedCount = $module->contents()->whereIn('id', $ids)->count();
        if ($ownedCount !== count($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'One or more contents do not belong to this module.',
            ], 422);
        }

        $module->reorderContents($ids);

        return response()->json([
            'success' => true,
            'message' => 'Module contents reordered successfully',
        ]);
    }

    /**
     * Admin/instructor: learner progress for a course (course + modules + lessons).
     */
    public function courseProgress(Request $request, $courseId)
    {
        $course = $this->findOwnedCourse($courseId);

        $search = trim((string) $request->get('search', ''));
        $status = $request->get('status'); // all|in_progress|completed|active

        $enrollments = CourseEnrollment::with(['user:id,first_name,last_name,email'])
            ->where('course_id', $course->id)
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($search !== '', function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('updated_at')
            ->paginate((int) $request->get('per_page', 20));

        $modules = $course->modules()->orderBy('order')->get(['id', 'title', 'order']);
        $moduleIds = $modules->pluck('id');

        $data = collect($enrollments->items())->map(function (CourseEnrollment $enrollment) use ($course, $modules, $moduleIds) {
            $userId = $enrollment->user_id;

            $lessonRows = LessonProgress::where('user_id', $userId)
                ->where('course_id', $course->id)
                ->get()
                ->keyBy('content_id');

            $moduleRows = ModuleProgress::where('user_id', $userId)
                ->whereIn('module_id', $moduleIds)
                ->get()
                ->keyBy('module_id');

            // Sync missing module progress snapshots
            $moduleProgress = $modules->map(function (CourseModule $module) use ($userId, $moduleRows) {
                $row = $moduleRows->get($module->id) ?? ModuleProgress::syncForUser($userId, $module->id);
                return [
                    'moduleId' => $module->id,
                    'title' => $module->title,
                    'order' => $module->order,
                    'progress' => $row?->progress_percentage ?? 0,
                    'isCompleted' => (bool) ($row?->is_completed ?? false),
                    'completedAt' => $row?->completed_at?->toISOString(),
                ];
            });

            $completedItems = CourseProgressCalculator::completedTrackable($course->id, $userId);
            $totalItems = CourseProgressCalculator::totalTrackable($course->id);
            $completedVideos = LessonProgress::where('user_id', $userId)
                ->where('course_id', $course->id)
                ->where('is_completed', true)
                ->whereHas('content', fn ($q) => $q->where('type', 'video'))
                ->count();
            $totalVideos = Content::where('course_id', $course->id)->where('type', 'video')->where('is_published', true)->count();

            $user = $enrollment->user;

            return [
                'enrollmentId' => $enrollment->id,
                'user' => [
                    'id' => $user?->id,
                    'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                    'email' => $user?->email,
                ],
                'status' => $enrollment->status,
                'progress' => (int) $enrollment->progress_percentage,
                'completedItems' => $completedItems,
                'totalItems' => $totalItems,
                'completedVideos' => $completedVideos,
                'totalVideos' => $totalVideos,
                'completedLessons' => $completedItems,
                'enrolledAt' => $enrollment->enrolled_at?->toISOString(),
                'lastAccessedAt' => $enrollment->last_accessed_at?->toISOString(),
                'completedAt' => $enrollment->completed_at?->toISOString(),
                'modules' => $moduleProgress,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'current_page' => $enrollments->currentPage(),
                'last_page' => $enrollments->lastPage(),
                'per_page' => $enrollments->perPage(),
                'total' => $enrollments->total(),
                'modules' => $modules->map(fn ($m) => [
                    'id' => $m->id,
                    'title' => $m->title,
                    'order' => $m->order,
                ]),
                'summary' => [
                    'enrolled' => CourseEnrollment::where('course_id', $course->id)->count(),
                    'completed' => CourseEnrollment::where('course_id', $course->id)->where('status', 'completed')->count(),
                    'in_progress' => CourseEnrollment::where('course_id', $course->id)->where('status', 'in_progress')->count(),
                    'avg_progress' => (int) round(CourseEnrollment::where('course_id', $course->id)->avg('progress_percentage') ?? 0),
                ],
            ],
        ]);
    }

    private function transformModule(CourseModule $module, bool $withContents = false): array
    {
        $data = [
            'id' => $module->id,
            'courseId' => $module->course_id,
            'title' => $module->title,
            'slug' => $module->slug,
            'description' => $module->description,
            'thumbnailUrl' => MediaUrl::url($module->thumbnail_path),
            'thumbnailPath' => $module->thumbnail_path,
            'order' => $module->order,
            'isPublished' => $module->is_published,
            'contentCount' => $module->contents_count ?? $module->contents()->count(),
            'videoCount' => $module->relationLoaded('contents')
                ? $module->contents->where('type', 'video')->count()
                : $module->contents()->where('type', 'video')->count(),
            'documentCount' => $module->relationLoaded('contents')
                ? $module->contents->whereIn('type', ['document', 'image'])->count()
                : $module->contents()->whereIn('type', ['document', 'image'])->count(),
            'createdAt' => $module->created_at?->toISOString(),
            'updatedAt' => $module->updated_at?->toISOString(),
        ];

        if ($withContents) {
            $contents = $module->relationLoaded('contents')
                ? $module->contents
                : $module->contents()->orderBy('order')->get();

            $data['contents'] = $contents->map(fn (Content $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'type' => $c->type,
                'order' => $c->order,
                'published' => $c->is_published,
                'moduleId' => $c->module_id,
                'courseId' => $c->course_id,
                'duration' => $c->duration,
                'views' => $c->views,
                'downloads' => $c->downloads,
            ])->values();
        }

        return $data;
    }

    private function resolveModuleThumbnail(Request $request): string|\Illuminate\Http\JsonResponse|null
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
                'modules/thumbnails',
                Str::random(20) . '.' . $file->getClientOriginalExtension(),
                $file
            );
        }

        return null;
    }
}
