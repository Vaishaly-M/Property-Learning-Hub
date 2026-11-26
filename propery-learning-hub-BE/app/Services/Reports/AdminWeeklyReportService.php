<?php
// app/Services/Reports/AdminWeeklyReportService.php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\WeeklyReport;
use Carbon\Carbon;

class AdminWeeklyReportService
{
    /**
     * Get aggregated reports for all users
     */
    public function getAllUsersReport(?Carbon $weekStart = null): array
    {
        $weekStart = $weekStart ?? Carbon::now()->startOfWeek(Carbon::SATURDAY);
        $weekEnd = $weekStart->copy()->endOfWeek();
        
        $reports = WeeklyReport::where('week_start', $weekStart->toDateString())
            ->with('user')
            ->get();
            
        $totalUsers = User::whereIn('role', ['learner', 'admin'])->count();
        
        // Aggregate metrics
        $aggregated = [
            'total_users' => $totalUsers,
            'reports_generated' => $reports->count(),
            'total_courses_enrolled' => $reports->sum('courses_enrolled_current'),
            'total_courses_completed' => $reports->sum('courses_completed_current'),
            'total_lessons_completed' => $reports->sum('lessons_completed_current'),
            'total_watch_time_seconds' => $reports->sum('watch_time_seconds_current'),
            'total_meetings_attended' => $reports->sum('meetings_attended_current'),
            'total_webinars_attended' => $reports->sum('webinars_attended_current'),
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
        ];
        
        // Calculate averages
        if ($reports->count() > 0) {
            $aggregated['avg_courses_completed'] = round($aggregated['total_courses_completed'] / $reports->count(), 1);
            $aggregated['avg_lessons_completed'] = round($aggregated['total_lessons_completed'] / $reports->count(), 1);
            $aggregated['avg_watch_time_minutes'] = round(($aggregated['total_watch_time_seconds'] / $reports->count()) / 60, 1);
        } else {
            $aggregated['avg_courses_completed'] = 0;
            $aggregated['avg_lessons_completed'] = 0;
            $aggregated['avg_watch_time_minutes'] = 0;
        }
        
        // Get top performers
        $topPerformers = $reports->sortByDesc('courses_completed_current')
            ->take(5)
            ->map(function ($report) {
                return [
                    'user_name' => $report->user->first_name . ' ' . $report->user->last_name,
                    'courses_completed' => $report->courses_completed_current,
                    'lessons_completed' => $report->lessons_completed_current,
                    'watch_time_hours' => round($report->watch_time_seconds_current / 3600, 1),
                ];
            })
            ->values()
            ->toArray();
            
        $aggregated['top_performers'] = $topPerformers;
        
        // Get user-specific reports with comparison to previous week
        $userReports = $reports->map(function ($report) {
            return [
                'user_id' => $report->user_id,
                'user_name' => $report->user->first_name . ' ' . $report->user->last_name,
                'user_email' => $report->user->email,
                'role' => $report->user->role,
                'courses_completed' => $report->courses_completed_current,
                'courses_completed_change' => $report->getComparisonChange('courses_completed'),
                'lessons_completed' => $report->lessons_completed_current,
                'lessons_completed_change' => $report->getComparisonChange('lessons_completed'),
                'watch_time_formatted' => $report->getWatchTimeCurrentFormattedAttribute(),
                'meetings_attended' => $report->meetings_attended_current,
                'webinars_attended' => $report->webinars_attended_current,
                'status_message' => $report->status_message,
            ];
        })->toArray();
        
        return [
            'aggregated' => $aggregated,
            'user_reports' => $userReports,
        ];
    }

    /**
     * Get report for a specific user
     */
    public function getUserReport(int $userId, ?Carbon $weekStart = null): ?array
    {
        $weekStart = $weekStart ?? Carbon::now()->startOfWeek(Carbon::SATURDAY);
        
        $report = WeeklyReport::where('user_id', $userId)
            ->where('week_start', $weekStart->toDateString())
            ->with('user')
            ->first();
            
        if (!$report) {
            return null;
        }
        
        return [
            'user' => [
                'id' => $report->user->id,
                'name' => $report->user->first_name . ' ' . $report->user->last_name,
                'email' => $report->user->email,
                'role' => $report->user->role,
            ],
            'current_week' => [
                'week_start' => $report->week_start->toDateString(),
                'week_end' => $report->week_end->toDateString(),
                'courses_enrolled' => $report->courses_enrolled_current,
                'courses_completed' => $report->courses_completed_current,
                'lessons_completed' => $report->lessons_completed_current,
                'watch_time_hours' => round($report->watch_time_seconds_current / 3600, 1),
                'watch_time_formatted' => $report->getWatchTimeCurrentFormattedAttribute(),
                'meetings_attended' => $report->meetings_attended_current,
                'webinars_attended' => $report->webinars_attended_current,
            ],
            'previous_week' => [
                'week_start' => Carbon::parse($report->week_start)->subWeek()->toDateString(),
                'week_end' => Carbon::parse($report->week_end)->subWeek()->toDateString(),
                'courses_enrolled' => $report->courses_enrolled_previous,
                'courses_completed' => $report->courses_completed_previous,
                'lessons_completed' => $report->lessons_completed_previous,
                'watch_time_formatted' => $report->getWatchTimePreviousFormattedAttribute(),
                'meetings_attended' => $report->meetings_attended_previous,
                'webinars_attended' => $report->webinars_attended_previous,
            ],
            'comparison' => [
                'courses_completed' => [
                    'change' => $report->getComparisonChange('courses_completed'),
                    'trend' => $report->getTrend('courses_completed'),
                ],
                'lessons_completed' => [
                    'change' => $report->getComparisonChange('lessons_completed'),
                    'trend' => $report->getTrend('lessons_completed'),
                ],
                'watch_time' => [
                    'change' => $report->getComparisonChange('watch_time_seconds'),
                    'trend' => $report->getTrend('watch_time_seconds'),
                ],
            ],
            'status_message' => $report->status_message,
            'next_week_goals' => $report->next_week_goals,
        ];
    }
}