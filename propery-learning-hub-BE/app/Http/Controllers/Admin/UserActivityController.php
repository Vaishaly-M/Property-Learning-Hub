<?php
// app/Http/Controllers/Admin/UserActivityController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class UserActivityController extends Controller
{
    /**
     * Get user activity logs
     */
    public function index(Request $request, User $user)
    {
        $perPage = $request->get('per_page', 20);
        $activities = ActivityLog::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'data' => $activities,
            'pagination' => [
                'current_page' => $activities->currentPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
                'last_page' => $activities->lastPage(),
            ]
        ]);
    }
    
    /**
     * Add activity log manually
     */
    public function store(Request $request, User $user)
    {
        $validated = $request->validate([
            'action' => 'required|string|max:255',
            'details' => 'required|string',
        ]);
        
        $activity = ActivityLog::create([
            'user_id' => $user->id,
            'action' => $validated['action'],
            'details' => $validated['details'],
            'performed_by' => auth()->id(),
            'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Activity logged successfully',
            'data' => $activity
        ], 201);
    }
    
    /**
     * Delete activity log
     */
    public function destroy(User $user, ActivityLog $activity)
    {
        if ($activity->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Activity log not found for this user'
            ], 404);
        }
        
        $activity->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Activity log deleted successfully'
        ]);
    }
}