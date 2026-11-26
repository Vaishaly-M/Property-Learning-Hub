<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('admin');
        
        // Filter by action
        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }
        
        // Filter by admin
        if ($adminId = $request->query('admin_id')) {
            $query->where('admin_id', $adminId);
        }
        
        // Filter by date range
        if ($startDate = $request->query('start_date')) {
            $query->where('created_at', '>=', $startDate);
        }
        
        if ($endDate = $request->query('end_date')) {
            $query->where('created_at', '<=', $endDate);
        }
        
        // Search
        if ($search = $request->query('search')) {
            $query->where(function($q) use ($search) {
                $q->where('details', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }
        
        $logs = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }

    public function stats(Request $request)
    {
        $totalLogs = ActivityLog::count();
        $todayLogs = ActivityLog::whereDate('created_at', today())->count();
        $uniqueAdmins = ActivityLog::distinct('admin_id')->count('admin_id');
        
        // Top activities
        $topActivities = ActivityLog::select('action')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('action')
            ->orderBy('count', 'desc')
            ->limit(5)
            ->get();
        
        // Recent activities
        $recentActivities = ActivityLog::with('admin')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => [
                'total_logs' => $totalLogs,
                'today_logs' => $todayLogs,
                'unique_admins' => $uniqueAdmins,
                'top_activities' => $topActivities,
                'recent_activities' => $recentActivities,
            ]
        ]);
    }
}