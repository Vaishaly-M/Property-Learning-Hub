<?php
// routes/learner/content.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Learner\LearnerContentController;
use App\Http\Controllers\Api\Learner\LearnerCourseController;

/*
|--------------------------------------------------------------------------
| Learner Content Routes (AUTHENTICATED)
|--------------------------------------------------------------------------
*/

Route::prefix('learner')->group(function () {

    // Content endpoints
    Route::get('/content', [LearnerContentController::class, 'index']);
    Route::get('/content/{id}', [LearnerContentController::class, 'show']);

    // Categories and Mentors
    Route::get('/categories', [LearnerContentController::class, 'getCategories']);
    Route::get('/mentors', [LearnerContentController::class, 'getMentors']);
    Route::get('/stats', [LearnerContentController::class, 'getStats']);

    // Courses browsing — use LearnerCourseController (modules-aware).
    // Do not point these at LearnerContentController; that overrides the
    // module-aware routes registered in instructor/content.php.
    Route::get('/courses', [LearnerCourseController::class, 'index']);
    Route::get('/courses/{id}', [LearnerCourseController::class, 'show']);

    // File access and tracking
    Route::get('/content/{id}/video-url', [LearnerContentController::class, 'getVideoUrl']);
    Route::get('/content/{id}/stream', [LearnerContentController::class, 'streamVideo'])
        ->withoutMiddleware(['auth:sanctum']);
    Route::get('/content/{id}/document', [LearnerContentController::class, 'downloadDocument'])
        ->withoutMiddleware(['auth:sanctum']);
    Route::post('/content/{id}/view', [LearnerContentController::class, 'recordView']);
    Route::post('/content/{id}/download', [LearnerContentController::class, 'downloadResource']);
});