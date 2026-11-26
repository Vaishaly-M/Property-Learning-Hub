<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessJournal;
use App\Models\JournalActivity;
use App\Models\JournalNote;
use App\Models\JournalDocument;
use App\Models\JournalShare;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class BusinessJournalController extends Controller
{
    // ==================== Shared Helpers ====================

    /**
     * Safely resolve a User for sharing, without assuming a 'name' column exists.
     * Only queries by email if the identifier is a valid email address, and only
     * falls back to a name-based match if that column actually exists on the
     * users table. This prevents SQL errors when sharedWith contains display
     * placeholders (e.g. "Mentor: Sarah Johnson") instead of real emails.
     */
    private function findSharedUser(string $identifier): ?User
    {
        // Only attempt an email lookup if it's actually a valid email
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $identifier)->first();
            if ($user) {
                return $user;
            }
        }

        // Fallback: only try a "name" style match if that column really exists.
        // Adjust the column name here once you confirm your actual users schema
        // (e.g. it might be 'first_name' or a concatenation of first/last name).
        if (Schema::hasColumn('users', 'name')) {
            return User::where('name', $identifier)->first();
        }

        // No valid email and no name column to match against — nothing to link.
        return null;
    }

    // ==================== Journal (Mission/Vision/Roadmap) ====================
    
    public function getJournal()
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            $journal = BusinessJournal::where('user_id', $userId)->first();
            
            if (!$journal) {
                $journal = BusinessJournal::create([
                    'user_id' => $userId,
                    'mission' => '',
                    'visions' => json_encode([]),
                    'roadmap' => json_encode([]),
                ]);
            }
            
            // Ensure fields are properly formatted
            $data = [
                'mission' => $journal->mission ?? '',
                'visions' => is_array($journal->visions) ? $journal->visions : (json_decode($journal->visions, true) ?? []),
                'roadmap' => is_array($journal->roadmap) ? $journal->roadmap : (json_decode($journal->roadmap, true) ?? []),
            ];
            
            return response()->json([
                'success' => true,
                'data' => $data
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting journal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get journal data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function updateJournal(Request $request)
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            $journal = BusinessJournal::where('user_id', $userId)->first();
            
            if (!$journal) {
                $journal = BusinessJournal::create(['user_id' => $userId]);
            }
            
            $validated = $request->validate([
                'mission' => 'nullable|string',
                'visions' => 'nullable|array',
                'roadmap' => 'nullable|array',
            ]);
            
            $updateData = [];
            
            if (isset($validated['mission'])) {
                $updateData['mission'] = $validated['mission'];
            }
            
            if (isset($validated['visions'])) {
                $updateData['visions'] = $validated['visions'];
            }
            
            if (isset($validated['roadmap'])) {
                $updateData['roadmap'] = $validated['roadmap'];
            }
            
            $journal->update($updateData);
            
            // Refresh the model to get updated data
            $journal->refresh();
            
            return response()->json([
                'success' => true,
                'message' => 'Journal updated successfully',
                'data' => [
                    'mission' => $journal->mission ?? '',
                    'visions' => is_array($journal->visions) ? $journal->visions : (json_decode($journal->visions, true) ?? []),
                    'roadmap' => is_array($journal->roadmap) ? $journal->roadmap : (json_decode($journal->roadmap, true) ?? []),
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating journal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update journal: ' . $e->getMessage()
            ], 500);
        }
    }
    
    // ==================== Notes ====================
    
    public function getNotes(Request $request)
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            $query = JournalNote::with('user')
                ->where('user_id', $userId);
            
            // Filter by type
            if ($request->has('type') && $request->type !== 'all' && $request->type !== '') {
                $query->where('type', $request->type);
            }
            
            $notes = $query->orderBy('created_at', 'desc')->get();
            
            $formattedNotes = $notes->map(function ($note) {
                return [
                    'id' => $note->id,
                    'title' => $note->title,
                    'content' => $note->content,
                    'type' => $note->type ?? 'checkbox',
                    'author' => $note->user->role ?? 'learner',
                    'authorName' => $note->user->name ?? 'Unknown User',
                    'sharedWith' => is_array($note->shared_with) ? $note->shared_with : (json_decode($note->shared_with, true) ?? ['Mentor: Sarah Johnson']),
                    'date' => $note->created_at->format('Y-m-d'),
                    'goal' => $note->goal,
                    'checklist' => is_array($note->checklist) ? $note->checklist : (json_decode($note->checklist, true) ?? []),
                    'checkedItems' => is_array($note->checked_items) ? $note->checked_items : (json_decode($note->checked_items, true) ?? []),
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedNotes
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting notes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get notes: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function createNote(Request $request)
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'type' => 'required|in:checkbox,business-plan,marketing-plan',
                'goal' => 'nullable|string',
                'checklist' => 'nullable|array',
                'checkedItems' => 'nullable|array',
                'sharedWith' => 'nullable|array',
            ]);
            
            $note = JournalNote::create([
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'content' => $validated['content'],
                'type' => $validated['type'],
                'goal' => $validated['goal'] ?? null,
                'checklist' => $validated['checklist'] ?? [],
                'checked_items' => $validated['checkedItems'] ?? [],
                'shared_with' => $validated['sharedWith'] ?? ['Mentor: Sarah Johnson'],
            ]);
            
            // Create share entries if shared_with is provided
            if (!empty($validated['sharedWith'])) {
                foreach ($validated['sharedWith'] as $shareWith) {
                    $sharedUser = $this->findSharedUser($shareWith);

                    if ($sharedUser && $sharedUser->id !== Auth::id()) {
                        JournalShare::create([
                            'note_id' => $note->id,
                            'shared_by' => Auth::id(),
                            'shared_with' => $sharedUser->id,
                            'permission' => 'view',
                        ]);
                    }
                }
            }
            
            $note->load('user');
            
            return response()->json([
                'success' => true,
                'message' => 'Note created successfully',
                'data' => [
                    'id' => $note->id,
                    'title' => $note->title,
                    'content' => $note->content,
                    'type' => $note->type,
                    'author' => $note->user->role ?? 'learner',
                    'authorName' => $note->user->name ?? 'Unknown User',
                    'sharedWith' => is_array($note->shared_with) ? $note->shared_with : (json_decode($note->shared_with, true) ?? []),
                    'date' => $note->created_at->format('Y-m-d'),
                    'goal' => $note->goal,
                    'checklist' => is_array($note->checklist) ? $note->checklist : (json_decode($note->checklist, true) ?? []),
                    'checkedItems' => is_array($note->checked_items) ? $note->checked_items : (json_decode($note->checked_items, true) ?? []),
                ]
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Error creating note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create note: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function updateNote(Request $request, $id)
    {
        try {
            $note = JournalNote::where('user_id', Auth::id())->findOrFail($id);
            
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'content' => 'sometimes|string',
                'type' => 'sometimes|in:checkbox,business-plan,marketing-plan',
                'goal' => 'nullable|string',
                'checklist' => 'nullable|array',
                'checkedItems' => 'nullable|array',
                'sharedWith' => 'nullable|array',
            ]);
            
            $updateData = [];
            
            if (isset($validated['title'])) $updateData['title'] = $validated['title'];
            if (isset($validated['content'])) $updateData['content'] = $validated['content'];
            if (isset($validated['type'])) $updateData['type'] = $validated['type'];
            if (isset($validated['goal'])) $updateData['goal'] = $validated['goal'];
            if (isset($validated['checklist'])) $updateData['checklist'] = $validated['checklist'];
            if (isset($validated['checkedItems'])) $updateData['checked_items'] = $validated['checkedItems'];
            if (isset($validated['sharedWith'])) $updateData['shared_with'] = $validated['sharedWith'];
            
            $note->update($updateData);
            $note->load('user');
            
            return response()->json([
                'success' => true,
                'message' => 'Note updated successfully',
                'data' => [
                    'id' => $note->id,
                    'title' => $note->title,
                    'content' => $note->content,
                    'type' => $note->type,
                    'author' => $note->user->role ?? 'learner',
                    'authorName' => $note->user->name ?? 'Unknown User',
                    'sharedWith' => is_array($note->shared_with) ? $note->shared_with : (json_decode($note->shared_with, true) ?? []),
                    'date' => $note->created_at->format('Y-m-d'),
                    'goal' => $note->goal,
                    'checklist' => is_array($note->checklist) ? $note->checklist : (json_decode($note->checklist, true) ?? []),
                    'checkedItems' => is_array($note->checked_items) ? $note->checked_items : (json_decode($note->checked_items, true) ?? []),
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update note: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function deleteNote($id)
    {
        try {
            $note = JournalNote::where('user_id', Auth::id())->findOrFail($id);
            $note->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Note deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete note: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function shareNote(Request $request, $id)
    {
        try {
            $note = JournalNote::where('user_id', Auth::id())->findOrFail($id);
            
            $validated = $request->validate([
                'email' => 'required|email|exists:users,email',
                'permission' => 'sometimes|in:view,edit',
            ]);
            
            $sharedUser = User::where('email', $validated['email'])->first();
            
            if ($sharedUser->id === Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot share with yourself'
                ], 422);
            }
            
            $existingShare = JournalShare::where('note_id', $id)
                ->where('shared_with', $sharedUser->id)
                ->first();
                
            if ($existingShare) {
                return response()->json([
                    'success' => false,
                    'message' => 'Note already shared with this user'
                ], 422);
            }
            
            $share = JournalShare::create([
                'note_id' => $id,
                'shared_by' => Auth::id(),
                'shared_with' => $sharedUser->id,
                'permission' => $validated['permission'] ?? 'view',
            ]);
            
            // Update note's shared_with array
            $sharedWith = is_array($note->shared_with) ? $note->shared_with : (json_decode($note->shared_with, true) ?? []);
            if (!in_array($validated['email'], $sharedWith)) {
                $sharedWith[] = $validated['email'];
                $note->update(['shared_with' => $sharedWith]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Note shared successfully',
                'data' => $share
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error sharing note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to share note: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getSharedNotes()
    {
        try {
            $userId = Auth::id();
            
            $sharedNotes = JournalShare::where('shared_with', $userId)
                ->with(['note.user'])
                ->whereNotNull('note_id')
                ->get();
                
            $formattedNotes = $sharedNotes->map(function ($share) {
                $note = $share->note;
                if (!$note) return null;
                
                return [
                    'id' => $note->id,
                    'title' => $note->title,
                    'content' => $note->content,
                    'type' => $note->type,
                    'author' => $note->user->role ?? 'learner',
                    'authorName' => $note->user->name ?? 'Unknown User',
                    'sharedWith' => is_array($note->shared_with) ? $note->shared_with : (json_decode($note->shared_with, true) ?? []),
                    'date' => $note->created_at->format('Y-m-d'),
                    'goal' => $note->goal,
                    'checklist' => is_array($note->checklist) ? $note->checklist : (json_decode($note->checklist, true) ?? []),
                    'checkedItems' => is_array($note->checked_items) ? $note->checked_items : (json_decode($note->checked_items, true) ?? []),
                    'permission' => $share->permission,
                    'shared_by' => $share->sharedBy->name ?? 'Unknown',
                ];
            })->filter();
            
            return response()->json([
                'success' => true,
                'data' => $formattedNotes->values()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting shared notes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get shared notes: ' . $e->getMessage()
            ], 500);
        }
    }
    

// ==================== Activities ====================

public function getActivities()
{
    try {
        $activities = JournalActivity::where('user_id', Auth::id())
            ->orderBy('date', 'desc')
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'date' => Carbon::parse($a->date)->format('d/m/Y'),
                    'status' => $a->status,
                ];
            });

        return response()->json(['success' => true, 'data' => $activities]);

    } catch (\Exception $e) {
        Log::error('Error getting activities: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to get activities: ' . $e->getMessage()
        ], 500);
    }
}

public function createActivity(Request $request)
{
    try {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|string|max:255',
            'status' => 'required|in:pending,completed',
        ]);

        try {
            $parsedDate = Carbon::createFromFormat('d/m/Y', $validated['date'])->startOfDay();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid date. Please enter a valid date in dd/mm/yyyy format'
            ], 422);
        }

        $activity = JournalActivity::create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'date' => $parsedDate->format('Y-m-d'), // store normalized
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Activity created successfully',
            'data' => [
                'id' => $activity->id,
                'title' => $activity->title,
                'date' => $parsedDate->format('d/m/Y'), // return dd/mm/yyyy
                'status' => $activity->status,
            ]
        ], 201);

    } catch (\Exception $e) {
        Log::error('Error creating activity: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to create activity: ' . $e->getMessage()
        ], 500);
    }
}

public function updateActivity(Request $request, $id)
{
    try {
        $activity = JournalActivity::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'date' => 'sometimes|string|max:255', // no longer 'date' rule — dd/mm/yyyy fails it
            'status' => 'sometimes|in:pending,completed',
        ]);

        $updateData = [];
        if (isset($validated['title'])) $updateData['title'] = $validated['title'];
        if (isset($validated['status'])) $updateData['status'] = $validated['status'];

        if (isset($validated['date'])) {
            try {
                $updateData['date'] = Carbon::createFromFormat('d/m/Y', $validated['date'])->format('Y-m-d');
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid date. Please enter a valid date in dd/mm/yyyy format'
                ], 422);
            }
        }

        $activity->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Activity updated successfully',
            'data' => [
                'id' => $activity->id,
                'title' => $activity->title,
                'date' => Carbon::parse($activity->date)->format('d/m/Y'),
                'status' => $activity->status,
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('Error updating activity: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to update activity: ' . $e->getMessage()
        ], 500);
    }
}

public function toggleActivityStatus($id)
{
    try {
        $activity = JournalActivity::where('user_id', Auth::id())->findOrFail($id);
        $activity->status = $activity->status === 'pending' ? 'completed' : 'pending';
        $activity->save();

        return response()->json([
            'success' => true,
            'message' => 'Activity status toggled',
            'data' => [
                'id' => $activity->id,
                'title' => $activity->title,
                'date' => Carbon::parse($activity->date)->format('d/m/Y'),
                'status' => $activity->status,
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('Error toggling activity: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to toggle activity: ' . $e->getMessage()
        ], 500);
    }
}

public function deleteActivity($id)
{
    try {
        $userId = Auth::id();

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated',
            ], 401);
        }

        $activity = JournalActivity::where('user_id', $userId)
            ->find($id);

        if (!$activity) {
            return response()->json([
                'success' => false,
                'message' => 'Activity not found or you do not have permission to delete it',
            ], 404);
        }

        $activity->delete();

        return response()->json([
            'success' => true,
            'message' => 'Activity deleted successfully',
        ]);

    } catch (\Exception $e) {
        Log::error('Error deleting activity', [
            'activity_id' => $id,
            'user_id' => Auth::id(),
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to delete activity: ' . $e->getMessage(),
        ], 500);
    }
}

    // ==================== Documents ====================
    
    public function getDocuments(Request $request)
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            $query = JournalDocument::with('user')
                ->where('user_id', $userId);
            
            // Filter by status
            if ($request->has('status') && $request->status !== 'all' && $request->status !== '') {
                $query->where('status', $request->status);
            }
            
            // Filter by category
            if ($request->has('category') && $request->category !== 'all' && $request->category !== '') {
                $query->where('category', $request->category);
            }
            
            // Search
            if ($request->has('search') && $request->search !== '') {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('content', 'like', "%{$search}%")
                      ->orWhereJsonContains('tags', $search);
                });
            }
            
            $documents = $query->orderBy('updated_at', 'desc')->get();
            
            $formattedDocuments = $documents->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'content' => $doc->content,
                    'templateId' => $doc->template_id,
                    'templateName' => $doc->template_name,
                    'author' => $doc->user->role ?? 'learner',
                    'authorName' => $doc->user->name ?? 'Unknown User',
                    'createdAt' => $doc->created_at->format('Y-m-d'),
                    'updatedAt' => $doc->updated_at->format('Y-m-d'),
                    'sharedWith' => is_array($doc->shared_with) ? $doc->shared_with : (json_decode($doc->shared_with, true) ?? []),
                    'tags' => is_array($doc->tags) ? $doc->tags : (json_decode($doc->tags, true) ?? []),
                    'category' => $doc->category,
                    'status' => $doc->status,
                    'formData' => is_array($doc->form_data) ? $doc->form_data : (json_decode($doc->form_data, true) ?? []),
                    'customQuestions' => is_array($doc->custom_questions) ? $doc->custom_questions : (json_decode($doc->custom_questions, true) ?? []),
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedDocuments
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get documents: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSharedDocuments()
    {
        try {
            $userId = Auth::id();
            
            $sharedDocs = JournalShare::where('shared_with', $userId)
                ->with(['document.user'])
                ->whereNotNull('document_id')
                ->get();
                
            $formattedDocs = $sharedDocs->map(function ($share) {
                $doc = $share->document;
                if (!$doc) return null;
                
                return [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'content' => $doc->content,
                    'templateId' => $doc->template_id,
                    'templateName' => $doc->template_name,
                    'author' => $doc->user->role ?? 'learner',
                    'authorName' => $doc->user->name ?? 'Unknown User',
                    'createdAt' => $doc->created_at->format('Y-m-d'),
                    'updatedAt' => $doc->updated_at->format('Y-m-d'),
                    'sharedWith' => is_array($doc->shared_with) ? $doc->shared_with : (json_decode($doc->shared_with, true) ?? []),
                    'tags' => is_array($doc->tags) ? $doc->tags : (json_decode($doc->tags, true) ?? []),
                    'category' => $doc->category,
                    'status' => $doc->status,
                    'formData' => is_array($doc->form_data) ? $doc->form_data : (json_decode($doc->form_data, true) ?? []),
                    'customQuestions' => is_array($doc->custom_questions) ? $doc->custom_questions : (json_decode($doc->custom_questions, true) ?? []),
                    'permission' => $share->permission,
                    'shared_by' => $share->sharedBy->name ?? 'Unknown',
                ];
            })->filter();
            
            return response()->json([
                'success' => true,
                'data' => $formattedDocs->values()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting shared documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get shared documents: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createDocument(Request $request)
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'nullable|string',
                'templateId' => 'nullable|string',
                'templateName' => 'nullable|string',
                'tags' => 'nullable|array',
                'sharedWith' => 'nullable|array',
                'category' => 'nullable|string|max:255',
                'status' => 'required|in:draft,published,archived',
                'formData' => 'nullable|array',
                'customQuestions' => 'nullable|array',
            ]);
            
            $document = JournalDocument::create([
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'content' => $validated['content'] ?? '',
                'template_id' => $validated['templateId'] ?? null,
                'template_name' => $validated['templateName'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'shared_with' => $validated['sharedWith'] ?? ['Mentor: Sarah Johnson'],
                'category' => $validated['category'] ?? null,
                'status' => $validated['status'],
                'form_data' => $validated['formData'] ?? [],
                'custom_questions' => $validated['customQuestions'] ?? [],
            ]);
            
            // Create share entries
            if (!empty($validated['sharedWith'])) {
                foreach ($validated['sharedWith'] as $shareWith) {
                    $sharedUser = $this->findSharedUser($shareWith);

                    if ($sharedUser && $sharedUser->id !== Auth::id()) {
                        JournalShare::create([
                            'document_id' => $document->id,
                            'shared_by' => Auth::id(),
                            'shared_with' => $sharedUser->id,
                            'permission' => 'view',
                        ]);
                    }
                }
            }
            
            $document->load('user');
            
            return response()->json([
                'success' => true,
                'message' => 'Document created successfully',
                'data' => [
                    'id' => $document->id,
                    'title' => $document->title,
                    'content' => $document->content,
                    'templateId' => $document->template_id,
                    'templateName' => $document->template_name,
                    'author' => $document->user->role ?? 'learner',
                    'authorName' => $document->user->name ?? 'Unknown User',
                    'createdAt' => $document->created_at->format('Y-m-d'),
                    'updatedAt' => $document->updated_at->format('Y-m-d'),
                    'sharedWith' => is_array($document->shared_with) ? $document->shared_with : (json_decode($document->shared_with, true) ?? []),
                    'tags' => is_array($document->tags) ? $document->tags : (json_decode($document->tags, true) ?? []),
                    'category' => $document->category,
                    'status' => $document->status,
                    'formData' => is_array($document->form_data) ? $document->form_data : (json_decode($document->form_data, true) ?? []),
                    'customQuestions' => is_array($document->custom_questions) ? $document->custom_questions : (json_decode($document->custom_questions, true) ?? []),
                ]
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Error creating document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create document: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateDocument(Request $request, $id)
    {
        try {
            $document = JournalDocument::where('user_id', Auth::id())->findOrFail($id);
            
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'content' => 'nullable|string',
                'templateId' => 'nullable|string',
                'templateName' => 'nullable|string',
                'tags' => 'nullable|array',
                'sharedWith' => 'nullable|array',
                'category' => 'nullable|string|max:255',
                'status' => 'sometimes|in:draft,published,archived',
                'formData' => 'nullable|array',
                'customQuestions' => 'nullable|array',
            ]);
            
            $updateData = [];
            
            if (isset($validated['title'])) $updateData['title'] = $validated['title'];
            if (isset($validated['content'])) $updateData['content'] = $validated['content'];
            if (isset($validated['templateId'])) $updateData['template_id'] = $validated['templateId'];
            if (isset($validated['templateName'])) $updateData['template_name'] = $validated['templateName'];
            if (isset($validated['tags'])) $updateData['tags'] = $validated['tags'];
            if (isset($validated['sharedWith'])) $updateData['shared_with'] = $validated['sharedWith'];
            if (isset($validated['category'])) $updateData['category'] = $validated['category'];
            if (isset($validated['status'])) $updateData['status'] = $validated['status'];
            if (isset($validated['formData'])) $updateData['form_data'] = $validated['formData'];
            if (isset($validated['customQuestions'])) $updateData['custom_questions'] = $validated['customQuestions'];
            
            $document->update($updateData);
            $document->load('user');
            
            return response()->json([
                'success' => true,
                'message' => 'Document updated successfully',
                'data' => [
                    'id' => $document->id,
                    'title' => $document->title,
                    'content' => $document->content,
                    'templateId' => $document->template_id,
                    'templateName' => $document->template_name,
                    'author' => $document->user->role ?? 'learner',
                    'authorName' => $document->user->name ?? 'Unknown User',
                    'createdAt' => $document->created_at->format('Y-m-d'),
                    'updatedAt' => $document->updated_at->format('Y-m-d'),
                    'sharedWith' => is_array($document->shared_with) ? $document->shared_with : (json_decode($document->shared_with, true) ?? []),
                    'tags' => is_array($document->tags) ? $document->tags : (json_decode($document->tags, true) ?? []),
                    'category' => $document->category,
                    'status' => $document->status,
                    'formData' => is_array($document->form_data) ? $document->form_data : (json_decode($document->form_data, true) ?? []),
                    'customQuestions' => is_array($document->custom_questions) ? $document->custom_questions : (json_decode($document->custom_questions, true) ?? []),
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update document: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteDocument($id)
    {
        try {
            $document = JournalDocument::where('user_id', Auth::id())->findOrFail($id);
            $document->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Document deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document: ' . $e->getMessage()
            ], 500);
        }
    }

    public function shareDocument(Request $request, $id)
    {
        try {
            $document = JournalDocument::where('user_id', Auth::id())->findOrFail($id);
            
            $validated = $request->validate([
                'email' => 'required|email|exists:users,email',
                'permission' => 'sometimes|in:view,edit',
            ]);
            
            $sharedUser = User::where('email', $validated['email'])->first();
            
            if ($sharedUser->id === Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot share with yourself'
                ], 422);
            }
            
            $existingShare = JournalShare::where('document_id', $id)
                ->where('shared_with', $sharedUser->id)
                ->first();
                
            if ($existingShare) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document already shared with this user'
                ], 422);
            }
            
            $share = JournalShare::create([
                'document_id' => $id,
                'shared_by' => Auth::id(),
                'shared_with' => $sharedUser->id,
                'permission' => $validated['permission'] ?? 'view',
            ]);
            
            // Update document's shared_with array
            $sharedWith = is_array($document->shared_with) ? $document->shared_with : (json_decode($document->shared_with, true) ?? []);
            if (!in_array($validated['email'], $sharedWith)) {
                $sharedWith[] = $validated['email'];
                $document->update(['shared_with' => $sharedWith]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Document shared successfully',
                'data' => $share
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error sharing document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to share document: ' . $e->getMessage()
            ], 500);
        }
    }

    public function exportDocument($id)
    {
        try {
            $document = JournalDocument::where('user_id', Auth::id())->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $document->id,
                    'title' => $document->title,
                    'content' => $document->content,
                    'formData' => is_array($document->form_data) ? $document->form_data : (json_decode($document->form_data, true) ?? []),
                    'templateName' => $document->template_name,
                    'createdAt' => $document->created_at->format('Y-m-d H:i:s'),
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error exporting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to export document: ' . $e->getMessage()
            ], 500);
        }
    }
}