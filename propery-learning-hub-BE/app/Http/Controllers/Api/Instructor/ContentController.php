<?php

namespace App\Http\Controllers\Api\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\ContentCategory;
use App\Models\Course;
use App\Models\CourseModule;
use App\Support\MediaStorage;
use App\Support\MediaUploadPath;
use App\Support\MediaUrl;
use App\Support\ContentMetrics;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ContentController extends Controller
{
    private function publicUrl(?string $path): ?string
    {
        return MediaUrl::url($path);
    }

    /* =========================================================
        INSTRUCTOR CONTENT MANAGEMENT
    ========================================================= */

    public function index(Request $request)
    {
        $user = auth()->user();

        $query = ContentMetrics::applyListFilters(
            ContentMetrics::query($user)->with(['category', 'course']),
            $request
        );

        // Sorting
        $sort = $request->get('sort', 'created_at');
        $order = $request->get('order', 'desc');

        if (!in_array($sort, ['title', 'views', 'downloads', 'created_at', 'order'])) {
            $sort = 'created_at';
        }

        $query->orderBy($sort, $order === 'asc' ? 'asc' : 'desc');
        if ($sort === 'order') {
            $query->orderBy('id', 'asc');
        }

        $content = $query->get()->map(fn ($item) => $this->transformContent($item));

        return response()->json([
            'success' => true,
            'data' => $content,
            'meta' => [
                'stats' => $this->getContentStats($user, $request)
            ]
        ]);
    }

    public function show($id)
    {
        $content = $this->manageableContentQuery()
            ->with(['category', 'course'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->transformContent($content)
        ]);
    }

    public function store(Request $request)
    {
        if ($uploadError = $this->uploadFailureResponse($request)) {
            return $uploadError;
        }

        $request->merge([
            'title' => trim((string) $request->input('title', '')),
            'description' => trim((string) $request->input('description', '')),
        ]);

        $rules = [
            'title'           => 'required|string|max:255',
            'description'     => 'required|string|min:1',
            'category_id'     => 'required|exists:content_categories,id',
            'type'            => 'required|in:video,document,image',
            'course_id'       => 'nullable|exists:courses,id',
            'module_id'       => 'nullable|exists:course_modules,id',
            'published'       => 'boolean',
            'is_lesson'       => 'boolean',
            'file_path'       => 'nullable|string|max:500',
            'file_name'       => 'nullable|string|max:255',
            'file_size'       => 'nullable|integer|min:1|max:2147483648',
            'thumbnail_path'  => 'nullable|string|max:500',
        ];

        if ($request->filled('file_path')) {
            $rules['file_name'] = 'required|string|max:255';
            $rules['file_size'] = 'required|integer|min:1|max:2147483648';
        } else {
            $rules['file'] = 'required|file|max:102400';
        }

        $rules['thumbnail_image'] = 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120';

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        // Verify course belongs to user if provided
        $course = null;
        if ($request->filled('course_id')) {
            $course = $this->ownedCourseQuery()
                ->where('id', $request->course_id)
                ->first();
            
            if (!$course) {
                return response()->json([
                    'success' => false,
                    'message' => 'Course not found or does not belong to you'
                ], 404);
            }
        }

        $module = null;
        if ($request->filled('module_id')) {
            $moduleQuery = CourseModule::query()->where('id', $request->module_id);
            if ($course) {
                $moduleQuery->where('course_id', $course->id);
            }
            $module = $moduleQuery->first();
            if (!$module) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found for this course',
                ], 404);
            }
            if (!$course) {
                $course = $this->ownedCourseQuery()->where('id', $module->course_id)->first();
                if (!$course) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Course not found or does not belong to you',
                    ], 404);
                }
            }
        } elseif ($course) {
            $module = $course->ensureDefaultModule();
        }

        $uploadedFile = $this->resolveMainFileUpload($request, $request->type);
        if ($uploadedFile instanceof \Illuminate\Http\JsonResponse) {
            return $uploadedFile;
        }

        $thumbnailPath = $this->resolveThumbnailUpload($request, $request->type);
        if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
            return $thumbnailPath;
        }

        // Get next order if adding to module/course
        $order = 0;
        if ($module) {
            $order = (Content::where('module_id', $module->id)->max('order') ?? 0) + 1;
        } elseif ($course) {
            $order = (Content::where('course_id', $course->id)->max('order') ?? 0) + 1;
        }

        $content = Content::create([
            'title'        => $request->title,
            'slug'         => Str::slug($request->title) . '-' . Str::random(6),
            'description'  => $request->input('description', ''),
            'category_id'  => $request->category_id,
            'user_id'      => auth()->id(),
            'course_id'    => $course?->id,
            'module_id'    => $module?->id,
            'order'        => $order,
            'type'         => $request->type,
            'file_path'    => $uploadedFile['path'],
            'file_name'    => $uploadedFile['name'],
            'file_size'    => $uploadedFile['size'],
            'thumbnail_path' => $thumbnailPath,
            'duration'     => $request->duration, // Optional, can be null
            'is_published' => $request->boolean('published', true),
            'published_at' => $request->boolean('published', true) ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Content uploaded successfully',
            'data'    => $this->transformContent($content->fresh(['category', 'course', 'module']))
        ], 201);
    }

    public function update(Request $request, $id)
    {
        if ($uploadError = $this->uploadFailureResponse($request)) {
            return $uploadError;
        }

        $request->merge([
            'title' => trim((string) $request->input('title', '')),
            'description' => trim((string) $request->input('description', '')),
        ]);

        $content = $this->manageableContentQuery()->findOrFail($id);

        $rules = [
            'title'       => 'required|string|max:255',
            'description' => 'required|string|min:1',
            'category_id' => 'required|exists:content_categories,id',
            'duration'    => 'nullable|string',
            'course_id'   => 'nullable|exists:courses,id',
            'published'   => 'boolean',
            'file_path'   => 'nullable|string|max:500',
            'file_name'   => 'nullable|string|max:255',
            'file_size'   => 'nullable|integer|min:1|max:2147483648',
            'thumbnail_path' => 'nullable|string|max:500',
        ];

        if ($request->filled('file_path')) {
            $rules['file_name'] = 'required_with:file_path|string|max:255';
            $rules['file_size'] = 'required_with:file_path|integer|min:1|max:2147483648';
        } else {
            $rules['file'] = 'nullable|file|max:102400';
        }

        if ($content->type === 'video') {
            $rules['thumbnail_image'] = 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        // Verify course belongs to user if provided
        if ($request->filled('course_id')) {
            $course = $this->ownedCourseQuery()
                ->where('id', $request->course_id)
                ->first();
            
            if (!$course) {
                return response()->json([
                    'success' => false,
                    'message' => 'Course not found or does not belong to you'
                ], 404);
            }
        }

        if ($request->filled('file_path')) {
            $uploadedFile = $this->resolveMainFileUpload($request, $content->type);
            if ($uploadedFile instanceof \Illuminate\Http\JsonResponse) {
                return $uploadedFile;
            }

            MediaStorage::delete($content->file_path);
            $content->file_path = $uploadedFile['path'];
            $content->file_name = $uploadedFile['name'];
            $content->file_size = $uploadedFile['size'];
        } elseif ($request->hasFile('file')) {
            MediaStorage::delete($content->file_path);

            $file = $request->file('file');
            $content->file_path = MediaStorage::store($file, "content/{$content->type}s");
            $content->file_name = $file->getClientOriginalName();
            $content->file_size = $file->getSize();
        }

        if ($content->type === 'video') {
            if ($request->filled('thumbnail_path')) {
                $thumbnailPath = $this->resolveThumbnailUpload($request, $content->type);
                if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
                    return $thumbnailPath;
                }

                if ($content->thumbnail_path) {
                    MediaStorage::delete($content->thumbnail_path);
                }
                $content->thumbnail_path = $thumbnailPath;
            } elseif ($request->hasFile('thumbnail_image')) {
                if ($content->thumbnail_path) {
                    MediaStorage::delete($content->thumbnail_path);
                }

                $thumbnail = $request->file('thumbnail_image');
                $content->thumbnail_path = MediaStorage::store($thumbnail, 'content/thumbnails');
            }
        }

        // Handle course / module assignment when explicitly sent
        if ($request->has('course_id') || $request->has('module_id')) {
            $newCourseId = $request->has('course_id')
                ? ($request->input('course_id') ?: null)
                : $content->course_id;
            $newModuleId = $request->has('module_id')
                ? ($request->input('module_id') ?: null)
                : $content->module_id;

            if ($newModuleId) {
                $module = CourseModule::find($newModuleId);
                if (!$module || ($newCourseId && (int) $module->course_id !== (int) $newCourseId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Module does not belong to the selected course',
                    ], 422);
                }
                $newCourseId = $module->course_id;
            } elseif ($newCourseId) {
                $course = $this->ownedCourseQuery()->where('id', $newCourseId)->first();
                if ($course) {
                    $newModuleId = $course->ensureDefaultModule()->id;
                }
            }

            $courseChanged = (string) $newCourseId !== (string) $content->course_id;
            $moduleChanged = (string) $newModuleId !== (string) $content->module_id;

            if ($courseChanged || $moduleChanged) {
                if ($newCourseId) {
                    $orderScope = $newModuleId
                        ? Content::where('module_id', $newModuleId)
                        : Content::where('course_id', $newCourseId);
                    $content->order = ($orderScope->max('order') ?? 0) + 1;
                    $content->course_id = $newCourseId;
                    $content->module_id = $newModuleId;
                } else {
                    $content->course_id = null;
                    $content->module_id = null;
                    $content->order = 0;
                }
            }
        }

        $content->title = $request->title;
        $content->description = $request->input('description', '');
        $content->category_id = $request->category_id;
        $content->duration = $request->duration;
        $content->is_published = $request->boolean('published', $content->is_published);
        $content->published_at = $content->is_published ? ($content->published_at ?? now()) : null;
        $content->save();

        return response()->json([
            'success' => true,
            'message' => 'Content updated successfully',
            'data'    => $this->transformContent($content->fresh(['category', 'course', 'module']))
        ]);
    }

    public function destroy($id)
    {
        try {
            $content = $this->manageableContentQuery()->findOrFail($id);

            MediaStorage::delete($content->file_path);
            if ($content->thumbnail_path) {
                MediaStorage::delete($content->thumbnail_path);
            }

            \App\Models\LessonProgress::where('content_id', $content->id)->delete();
            $content->forceDelete();

            return response()->json([
                'success' => true,
                'message' => 'Content deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Content not found or you do not have permission to delete it.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete content: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function togglePublish($id)
    {
        $content = $this->manageableContentQuery()->findOrFail($id);
        $content->togglePublish();

        return response()->json([
            'success' => true,
            'message' => $content->is_published ? 'Content published' : 'Content unpublished',
            'data'    => $this->transformContent($content->fresh(['category', 'course']))
        ]);
    }

    /**
     * Reorder lessons within a course
     */
    public function reorderLessons(Request $request, $courseId)
    {
        $validator = Validator::make($request->all(), [
            'lesson_ids' => 'required|array|min:1',
            'lesson_ids.*' => 'integer|exists:contents,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $course = $this->ownedCourseQuery()->findOrFail($courseId);
        $lessonIds = array_map('intval', $request->lesson_ids);

        $lessons = Content::query()
            ->where('course_id', $course->id)
            ->whereIn('id', $lessonIds)
            ->get();

        if ($lessons->count() !== count($lessonIds)) {
            return response()->json([
                'success' => false,
                'message' => 'One or more lessons do not belong to this course.',
            ], 422);
        }

        $reorderType = $lessons->first()->type;

        $allTypeIds = Content::query()
            ->where('course_id', $course->id)
            ->where('type', $reorderType)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values()
            ->all();

        $submittedIds = collect($lessonIds)->map(fn ($id) => (int) $id)->sort()->values()->all();

        if ($allTypeIds !== $submittedIds) {
            return response()->json([
                'success' => false,
                'message' => 'Include every lesson of this type when reordering.',
            ], 422);
        }

        if ($lessons->contains(fn (Content $lesson) => $lesson->type !== $reorderType)) {
            return response()->json([
                'success' => false,
                'message' => 'All reordered lessons must be the same content type.',
            ], 422);
        }

        $allContent = Content::query()
            ->where('course_id', $course->id)
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        $orderedIds = [];
        $typeInserted = false;

        foreach ($allContent as $item) {
            if ($item->type === $reorderType) {
                if (!$typeInserted) {
                    foreach ($lessonIds as $lessonId) {
                        $orderedIds[] = $lessonId;
                    }
                    $typeInserted = true;
                }
                continue;
            }

            $orderedIds[] = $item->id;
        }

        if (!$typeInserted) {
            $orderedIds = array_merge($orderedIds, $lessonIds);
        }

        foreach ($orderedIds as $index => $contentId) {
            Content::where('id', $contentId)
                ->where('course_id', $course->id)
                ->update(['order' => $index + 1]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lessons reordered successfully'
        ]);
    }

    /* =========================================================
        PUBLIC / SHARED
    ========================================================= */

    public function incrementViews($id)
    {
        $content = Content::findOrFail($id);
        $content->incrementViews();

        return response()->json(['success' => true]);
    }

    public function incrementDownloads($id)
    {
        $content = Content::findOrFail($id);
        $content->incrementDownloads();

        return response()->json(['success' => true]);
    }

    public function getCategories()
    {
        $categories = ContentCategory::active()
            ->select('id', 'name', 'slug')
            ->orderBy('name')
            ->get();

        // Keep dropdown functional in environments where seed data is missing.
        if ($categories->isEmpty()) {
            $defaults = [
                ['name' => 'General', 'slug' => 'general'],
                ['name' => 'Property Strategy', 'slug' => 'property-strategy'],
                ['name' => 'Finance', 'slug' => 'finance'],
                ['name' => 'Legal & Compliance', 'slug' => 'legal-compliance'],
            ];
            foreach ($defaults as $default) {
                ContentCategory::firstOrCreate(
                    ['slug' => $default['slug']],
                    ['name' => $default['name'], 'is_active' => true]
                );
            }
            $categories = ContentCategory::active()
                ->select('id', 'name', 'slug')
                ->orderBy('name')
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    public function getCourses()
    {
        $user = auth()->user();
        
        $courses = $this->ownedCourseQuery()
            ->withCount('contents')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($course) {
                return [
                    'id'           => $course->id,
                    'title'        => $course->title,
                    'description'  => $course->description,
                    'thumbnailUrl' => $this->courseThumbnailUrl($course),
                    'thumbnailPath' => $course->thumbnail_path,
                    'contentCount' => $course->contents_count,
                    'createdAt'    => $course->created_at->toISOString(),
                    'updatedAt'    => $course->updated_at->toISOString(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $courses
        ]);
    }

    private function courseThumbnailUrl(Course $course): ?string
    {
        return $this->publicUrl($course->thumbnail_path);
    }

    public function getFile($id)
    {
        $content = $this->manageableContentQuery()->findOrFail($id);
        return $this->fileResponse($content);
    }

    public function downloadFile($id)
    {
        $content = $this->manageableContentQuery()->findOrFail($id);

        $storagePath = MediaStorage::normalizePath($content->file_path);
        if (!$storagePath || !MediaStorage::exists($storagePath)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found in storage. If this document was uploaded before S3 migration, please upload it again.',
            ], 404);
        }

        $fileName = $content->file_name ?: basename($storagePath);

        if (MediaStorage::usesCloud()) {
            $safeName = str_replace('"', '\\"', $fileName);

            return response()->json([
                'success' => true,
                'data' => [
                    'download_url' => MediaStorage::temporaryUrl(
                        $storagePath,
                        now()->addHours(2),
                        false,
                        ['ResponseContentDisposition' => 'attachment; filename="' . $safeName . '"']
                    ),
                    'file_name'    => $fileName,
                ],
            ]);
        }

        return MediaStorage::download(
            $storagePath,
            $fileName,
            MediaStorage::mimeType($storagePath)
        );
    }

    public function getPublicFile($id)
    {
        $content = Content::published()->findOrFail($id);
        return $this->fileResponse($content);
    }

    /* =========================================================
        HELPERS
    ========================================================= */

    private function resolveMainFileUpload(Request $request, string $type): array|\Illuminate\Http\JsonResponse
    {
        if ($request->filled('file_path')) {
            $path = ltrim($request->string('file_path')->toString(), '/');

            if (!MediaUploadPath::isAllowedPath($path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid file path.',
                ], 422);
            }

            if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Store the S3 object path only, not a full URL.',
                ], 422);
            }

            if (!MediaStorage::exists($path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Uploaded file was not found in storage. Please try uploading again.',
                ], 422);
            }

            return [
                'path' => $path,
                'name' => $request->string('file_name')->toString(),
                'size' => (int) $request->input('file_size'),
            ];
        }

        $file = $request->file('file');
        $path = MediaStorage::store($file, "content/{$type}s");

        return [
            'path' => $path,
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ];
    }

    private function resolveThumbnailUpload(Request $request, ?string $type = null): string|\Illuminate\Http\JsonResponse|null
    {
        $contentType = $type ?? $request->input('type');

        if ($contentType !== 'video' && !$request->filled('thumbnail_path') && !$request->hasFile('thumbnail_image')) {
            return null;
        }

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

        if ($request->hasFile('thumbnail_image')) {
            $thumbnail = $request->file('thumbnail_image');

            return MediaStorage::store($thumbnail, 'content/thumbnails');
        }

        return null;
    }

    private function fileResponse(Content $content)
    {
        if (!MediaStorage::exists($content->file_path)) {
            return response()->json(['success' => false, 'message' => 'File not found'], 404);
        }

        return response()->json([
            'success'   => true,
            'url'       => $this->publicUrl($content->file_path),
            'file_name' => $content->file_name
        ]);
    }

    private function transformContent(Content $content)
    {
        return [
            'id'          => $content->id,
            'title'       => $content->title,
            'description' => $content->description,
            'category'    => optional($content->category)->name,
            'category_id' => $content->category_id,
            'course_id'   => $content->course_id,
            'module_id'   => $content->module_id,
            'moduleTitle' => optional($content->module)->title,
            'order'       => $content->order,
            'type'        => $content->type,
            'uploadDate'  => $content->upload_date,
            'published'   => $content->is_published,
            'duration'    => $content->duration,
            'views'       => $content->views,
            'downloads'   => $content->downloads,
            'fileSize'    => $content->formatted_size,
            'fileName'    => $content->file_name,
            'fileUrl'     => $this->publicUrl($content->file_path),
            'thumbnailUrl'=> $this->publicUrl($content->thumbnail_path),
            'updatedAt'   => $content->updated_at?->toISOString(),
        ];
    }

    private function manageableContentQuery()
    {
        $user = auth()->user();
        $query = Content::query();

        if ($user->isAdmin()) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhereHas('course', function ($courseQuery) use ($user) {
                    $courseQuery->where('user_id', $user->id);
                })
                ->orWhereIn('course_id', function ($sub) use ($user) {
                    $sub->select('id')
                        ->from('courses')
                        ->where('user_id', $user->id);
                });
        });
    }

    private function ownedContentQuery()
    {
        $query = Content::query();
        if (!auth()->user()->isAdmin()) {
            $query->where('user_id', auth()->id());
        }
        return $query;
    }

    private function ownedCourseQuery()
    {
        $query = Course::query();
        if (!auth()->user()->isAdmin()) {
            $query->where('user_id', auth()->id());
        }
        return $query;
    }

    /**
     * Detect PHP/server upload limits stripping multipart files before validation.
     */
    private function uploadFailureResponse(Request $request): ?\Illuminate\Http\JsonResponse
    {
        if ($request->hasFile('file')) {
            return null;
        }

        $contentLength = (int) $request->server('CONTENT_LENGTH', 0);
        if ($contentLength <= 0) {
            return null;
        }

        $postMaxBytes = $this->parseIniSize(ini_get('post_max_size'));
        $uploadMaxBytes = $this->parseIniSize(ini_get('upload_max_filesize'));
        $serverLimit = min($postMaxBytes, $uploadMaxBytes);
        $serverLimitLabel = $this->formatBytes($serverLimit);

        if ($contentLength > $serverLimit) {
            return response()->json([
                'success' => false,
                'message' => "Upload failed: file exceeds the server limit of {$serverLimitLabel}.",
                'errors'  => [
                    'file' => ["The file is too large for the server (max {$serverLimitLabel}). Application limit is 100MB."],
                ],
            ], 413);
        }

        return null;
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
            return round($bytes / (1024 * 1024), 1) . 'MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . 'KB';
        }

        return $bytes . 'B';
    }

    private function getContentStats($user, Request $request): array
    {
        $counts = ContentMetrics::counts($user, $request);
        $filtered = ContentMetrics::applyListFilters(ContentMetrics::query($user), $request);

        $coursesQuery = Course::query();
        if (!$user->isAdmin()) {
            $coursesQuery->where('user_id', $user->id);
        }

        return [
            'total'     => $counts['total'],
            'videos'    => $counts['videos'],
            'documents' => $counts['documents'],
            'published' => $counts['published'],
            'views'     => (clone $filtered)->where('type', 'video')->sum('views'),
            'downloads' => (clone $filtered)->where('type', 'document')->sum('downloads'),
            'courses'   => $coursesQuery->count(),
        ];
    }
}