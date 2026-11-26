<?php
// app/Http/Controllers/Api/Learner/WeeklyReportController.php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Services\Reports\WeeklyReportService;
use App\Http\Resources\WeeklyReportResource;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Carbon\Carbon;

class WeeklyReportController extends Controller
{
    use ApiResponses;

    protected $reportService;

    public function __construct(WeeklyReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Get current week's report for the authenticated user
     */
    public function current(Request $request)
    {
        try {
            $user = $request->user();
            $report = $this->reportService->generateReport($user->id);
            
            if (!$report) {
                return $this->error('No report found for current week', 404);
            }
            
            // Load the user relationship if needed
            if (method_exists($report, 'load')) {
                $report->load('user');
            }
            
            return $this->success(new WeeklyReportResource($report));
        } catch (\Exception $e) {
            \Log::error('Error generating current report', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage()
            ]);
            
            return $this->error('Failed to generate current week report', 500);
        }
    }

    /**
     * Get report for a specific week
     */
    public function show(Request $request, $weekStart)
    {
        try {
            $user = $request->user();
            $weekStart = Carbon::parse($weekStart);
            
            // Check if report exists
            $report = \App\Models\WeeklyReport::where('user_id', $user->id)
                ->where('week_start', $weekStart->toDateString())
                ->with('user')
                ->first();
                
            if (!$report) {
                return $this->error('Weekly report not found for the specified week', 404);
            }
            
            return $this->success(new WeeklyReportResource($report));
        } catch (\Exception $e) {
            \Log::error('Error fetching week report', [
                'user_id' => $request->user()->id ?? null,
                'week_start' => $weekStart ?? null,
                'error' => $e->getMessage()
            ]);
            
            return $this->error('Failed to fetch weekly report', 500);
        }
    }

    /**
     * Get all reports for the authenticated user (with pagination)
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            $reports = \App\Models\WeeklyReport::where('user_id', $user->id)
                ->orderBy('week_start', 'desc')
                ->paginate(10);
            
            // Return with proper pagination structure
            return $this->success([
                'data' => WeeklyReportResource::collection($reports->items()),
                'meta' => [
                    'current_page' => $reports->currentPage(),
                    'last_page' => $reports->lastPage(),
                    'per_page' => $reports->perPage(),
                    'total' => $reports->total(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching all reports', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage()
            ]);
            
            return $this->error('Failed to fetch reports', 500);
        }
    }

    /**
     * Get comparison between two weeks
     */
    public function compare(Request $request)
    {
        try {
            $request->validate([
                'week1' => 'required|date',
                'week2' => 'required|date',
            ]);
            
            $user = $request->user();
            
            $report1 = \App\Models\WeeklyReport::where('user_id', $user->id)
                ->where('week_start', Carbon::parse($request->week1)->toDateString())
                ->first();
                
            $report2 = \App\Models\WeeklyReport::where('user_id', $user->id)
                ->where('week_start', Carbon::parse($request->week2)->toDateString())
                ->first();
                
            if (!$report1 || !$report2) {
                return $this->error('One or both reports not found', 404);
            }
            
            return $this->success([
                'week1' => new WeeklyReportResource($report1),
                'week2' => new WeeklyReportResource($report2),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error($e->errors(), 422);
        } catch (\Exception $e) {
            \Log::error('Error comparing weeks', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage()
            ]);
            
            return $this->error('Failed to compare weeks', 500);
        }
    }
}