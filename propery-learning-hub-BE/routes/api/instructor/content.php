<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Instructor\ContentController;
use App\Http\Controllers\Api\Instructor\CourseController;
use App\Http\Controllers\Api\Learner\LearnerCourseController;

/*
|--------------------------------------------------------------------------
| Instructor Only - Content Management
|--------------------------------------------------------------------------
*/
Route::middleware('instructor')
    ->prefix('instructor/content')
    ->group(function () {
        // Content endpoints
        Route::get('/', [ContentController::class, 'index']);
        Route::get('/categories', [ContentController::class, 'getCategories']);
        Route::get('/courses', [ContentController::class, 'getCourses']);
        Route::post('/', [ContentController::class, 'store']);

        Route::get('/{id}', [ContentController::class, 'show']);
        Route::post('/{id}', [ContentController::class, 'update']); // Using POST for file uploads
        Route::delete('/{id}', [ContentController::class, 'destroy']);

        Route::post('/{id}/toggle-publish', [ContentController::class, 'togglePublish']);
        Route::get('/{id}/file', [ContentController::class, 'getFile']);
        Route::get('/{id}/download', [ContentController::class, 'downloadFile']);
        
        // Lesson reordering
        Route::post('/courses/{courseId}/reorder-lessons', [ContentController::class, 'reorderLessons']);
    });

/*
|--------------------------------------------------------------------------
| Instructor Only - Course Management
|--------------------------------------------------------------------------
*/
Route::middleware('instructor')
    ->prefix('instructor/courses')
    ->group(function () {
        Route::get('/', [CourseController::class, 'index']);
        Route::post('/', [CourseController::class, 'store']);
        Route::post('/reorder', [CourseController::class, 'reorderCourses']);
        
        Route::get('/{id}', [CourseController::class, 'show']);
        Route::post('/{id}', [CourseController::class, 'update']); // Using POST for file uploads
        Route::delete('/{id}', [CourseController::class, 'destroy']);
        
        Route::get('/{id}/contents', [CourseController::class, 'getContents']);
        Route::post('/{id}/reorder', [CourseController::class, 'reorderContents']);
        Route::get('/{id}/progress', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'courseProgress']);
        
        // Modules
        Route::get('/{courseId}/modules', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'index']);
        Route::post('/{courseId}/modules', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'store']);
        Route::post('/{courseId}/modules/reorder', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'reorder']);
        Route::post('/{courseId}/modules/{moduleId}', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'update']);
        Route::delete('/{courseId}/modules/{moduleId}', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'destroy']);
        Route::post('/{courseId}/modules/{moduleId}/reorder-contents', [\App\Http\Controllers\Api\Instructor\ModuleController::class, 'reorderContents']);
        
        // Course statistics
        Route::get('/{id}/statistics', [CourseController::class, 'getStatistics']);
    });

/*
|--------------------------------------------------------------------------
| Learner - Course Learning & Progress
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')
    ->prefix('learner/courses')
    ->group(function () {
        // Browse and enroll
        Route::get('/', [LearnerCourseController::class, 'index']);
        Route::get('/my-enrollments', [LearnerCourseController::class, 'myEnrollments']);
        Route::post('/{id}/enroll', [LearnerCourseController::class, 'enroll']);
        
        // Course access
        Route::get('/{id}', [LearnerCourseController::class, 'show']);
        
        // Lesson access and progress
        Route::get('/{courseId}/lessons/{lessonId}', [LearnerCourseController::class, 'getLesson']);
        Route::post('/{courseId}/lessons/{lessonId}/progress', [LearnerCourseController::class, 'updateProgress']);
        Route::post('/{courseId}/lessons/{lessonId}/complete', [LearnerCourseController::class, 'completeLesson']);
    });

/*
|--------------------------------------------------------------------------
| Authenticated Users - Public Content Access
|--------------------------------------------------------------------------
*/
Route::prefix('content')->group(function () {
    Route::post('/{id}/increment-views', [ContentController::class, 'incrementViews']);
    Route::post('/{id}/increment-downloads', [ContentController::class, 'incrementDownloads']);
    Route::get('/{id}/public-file', [ContentController::class, 'getPublicFile']);
});