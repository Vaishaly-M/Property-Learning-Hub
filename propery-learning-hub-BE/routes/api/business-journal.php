<?php

use App\Http\Controllers\Api\BusinessJournalController;
use Illuminate\Support\Facades\Route;

// Common routes accessible by all authenticated users (learners, instructors, admins)
Route::prefix('business-journal')->group(function () {
    // Journal (Mission/Vision/Roadmap)
    Route::get('/journal', [BusinessJournalController::class, 'getJournal']);
    Route::put('/journal', [BusinessJournalController::class, 'updateJournal']);
    
    // Notes
    Route::get('/notes', [BusinessJournalController::class, 'getNotes']);
    Route::post('/notes', [BusinessJournalController::class, 'createNote']);
    Route::put('/notes/{id}', [BusinessJournalController::class, 'updateNote']);
    Route::delete('/notes/{id}', [BusinessJournalController::class, 'deleteNote']);
    Route::post('/notes/{id}/share', [BusinessJournalController::class, 'shareNote']);
    Route::get('/notes/shared', [BusinessJournalController::class, 'getSharedNotes']);
    
    // Activities
    Route::get('/activities', [BusinessJournalController::class, 'getActivities']);
    Route::post('/activities', [BusinessJournalController::class, 'createActivity']);
    Route::put('/activities/{id}', [BusinessJournalController::class, 'updateActivity']);
    Route::delete('/activities/{id}', [BusinessJournalController::class, 'deleteActivity']);
    Route::patch('/activities/{id}/toggle', [BusinessJournalController::class, 'toggleActivityStatus']);
    
    // Documents
    Route::get('/documents', [BusinessJournalController::class, 'getDocuments']);
    Route::get('/documents/shared', [BusinessJournalController::class, 'getSharedDocuments']);
    Route::post('/documents', [BusinessJournalController::class, 'createDocument']);
    Route::put('/documents/{id}', [BusinessJournalController::class, 'updateDocument']);
    Route::delete('/documents/{id}', [BusinessJournalController::class, 'deleteDocument']);
    Route::post('/documents/{id}/share', [BusinessJournalController::class, 'shareDocument']);
    Route::get('/documents/{id}/export', [BusinessJournalController::class, 'exportDocument']);
});