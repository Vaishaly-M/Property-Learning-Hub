<?php
// app/Http/Controllers/Admin/WeeklyReportController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Reports\AdminWeeklyReportService;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Carbon\Carbon;

class WeeklyReportController extends Controller
{
    use ApiResponses;

    protected $adminReportService;

    public function __construct(AdminWeeklyReportService $adminReportService)
    {
        $this->adminReportService = $adminReportService;
    }

    /**
     * Get aggregated reports for all users
     */
    public function allUsers(Request $request)
    {
        $weekStart = $request->week_start 
            ? Carbon::parse($request->week_start) 
            : Carbon::now()->startOfWeek(Carbon::SATURDAY);
            
        $data = $this->adminReportService->getAllUsersReport($weekStart);
        
        return $this->success($data);
    }

    /**
     * Get report for a specific user
     */
    public function user(Request $request, $userId)
    {
        $weekStart = $request->week_start 
            ? Carbon::parse($request->week_start) 
            : Carbon::now()->startOfWeek(Carbon::SATURDAY);
            
        $data = $this->adminReportService->getUserReport($userId, $weekStart);
        
        if (!$data) {
            return $this->notFound('Report for user');
        }
        
        return $this->success($data);
    }

    /**
     * Generate report for a specific user (admin action)
     */
    public function generateForUser(Request $request, $userId)
    {
        $service = app(\App\Services\Reports\WeeklyReportService::class);
        $report = $service->generateReport($userId);
        
        return $this->success(new \App\Http\Resources\WeeklyReportResource($report->load('user')));
    }

    /**
     * Get summary statistics for all users
     */
    public function summary(Request $request)
    {
        $weekStart = $request->week_start 
            ? Carbon::parse($request->week_start) 
            : Carbon::now()->startOfWeek(Carbon::SATURDAY);
            
        $data = $this->adminReportService->getAllUsersReport($weekStart);
        
        // Return only aggregated data
        return $this->success($data['aggregated']);
    }

    /**
     * Get top performers for the current week
     */
    public function topPerformers(Request $request)
    {
        $weekStart = $request->week_start 
            ? Carbon::parse($request->week_start) 
            : Carbon::now()->startOfWeek(Carbon::SATURDAY);
            
        $data = $this->adminReportService->getAllUsersReport($weekStart);
        
        return $this->success($data['top_performers']);
    }
}