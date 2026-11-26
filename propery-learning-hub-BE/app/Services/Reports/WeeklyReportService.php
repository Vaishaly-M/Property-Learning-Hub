<?php
// app/Services/Reports/WeeklyReportService.php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\WeeklyReport;
use App\Models\CourseEnrollment;
use App\Models\LessonProgress;
use App\Models\WebinarRegistration;
use App\Models\MeetingRegistration;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WeeklyReportService
{
    /**
     * Generate weekly report for a specific user
     */
    public function generateReport(int $userId, ?Carbon $weekStart = null): WeeklyReport
    {
        $weekStart = $weekStart ?? $this->getWeekStart();
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::FRIDAY); // Week ends on Friday
        $weekNumber = $weekStart->weekOfYear;
        $year = $weekStart->year;
        
        // Check if report already exists
        $existingReport = WeeklyReport::where('user_id', $userId)
            ->where('week_start', $weekStart->toDateString())
            ->first();
            
        if ($existingReport) {
            return $existingReport;
        }
        
        try {
            // Get current week metrics
            $currentMetrics = $this->getMetricsForPeriod($userId, $weekStart, $weekEnd);
            
            // Get previous week metrics
            $previousWeekStart = $weekStart->copy()->subWeek();
            $previousWeekEnd = $previousWeekStart->copy()->endOfWeek(Carbon::FRIDAY);
            $previousMetrics = $this->getMetricsForPeriod($userId, $previousWeekStart, $previousWeekEnd);
            
            // Calculate comparison data
            $comparisonData = $this->calculateComparison($currentMetrics, $previousMetrics);
            
            // Generate status message and next week goals
            $statusMessage = $this->generateStatusMessage($currentMetrics, $comparisonData);
            $nextWeekGoals = $this->generateNextWeekGoals($currentMetrics);
            
            // Create report
            return WeeklyReport::create([
                'user_id' => $userId,
                'week_start' => $weekStart,
                'week_end' => $weekEnd,
                'week_number' => $weekNumber,
                'year' => $year,
                
                'courses_enrolled_current' => $currentMetrics['courses_enrolled'],
                'courses_completed_current' => $currentMetrics['courses_completed'],
                'lessons_completed_current' => $currentMetrics['lessons_completed'],
                'watch_time_seconds_current' => $currentMetrics['watch_time_seconds'],
                'meetings_attended_current' => $currentMetrics['meetings_attended'],
                'webinars_attended_current' => $currentMetrics['webinars_attended'],
                
                'courses_enrolled_previous' => $previousMetrics['courses_enrolled'],
                'courses_completed_previous' => $previousMetrics['courses_completed'],
                'lessons_completed_previous' => $previousMetrics['lessons_completed'],
                'watch_time_seconds_previous' => $previousMetrics['watch_time_seconds'],
                'meetings_attended_previous' => $previousMetrics['meetings_attended'],
                'webinars_attended_previous' => $previousMetrics['webinars_attended'],
                
                'comparison_data' => $comparisonData,
                'status_message' => $statusMessage,
                'next_week_goals' => $nextWeekGoals,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to generate weekly report', [
                'user_id' => $userId,
                'week_start' => $weekStart->toDateString(),
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get metrics for a specific time period
     */
    private function getMetricsForPeriod(int $userId, Carbon $start, Carbon $end): array
    {
        // Courses enrolled in this period
        $coursesEnrolled = CourseEnrollment::where('user_id', $userId)
            ->whereBetween('enrolled_at', [$start, $end])
            ->count();
            
        // Courses completed in this period
        $coursesCompleted = CourseEnrollment::where('user_id', $userId)
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$start, $end])
            ->count();
            
        // Lessons completed in this period
        $lessonsCompleted = LessonProgress::where('user_id', $userId)
            ->where('is_completed', true)
            ->whereBetween('completed_at', [$start, $end])
            ->count();
            
        // Watch time in this period (sum of watch_time from lesson_progress)
        $watchTime = LessonProgress::where('user_id', $userId)
            ->whereBetween('updated_at', [$start, $end])
            ->sum('watch_time') ?? 0;
            
        // Meetings attended (approved registrations)
        $meetingsAttended = MeetingRegistration::where('learner_id', $userId)
            ->where('status', 'approved')
            ->whereBetween('approved_at', [$start, $end])
            ->count();
            
        // Webinars attended (approved registrations)
        $webinarsAttended = WebinarRegistration::where('learner_id', $userId)
            ->where('status', 'approved')
            ->whereBetween('approved_at', [$start, $end])
            ->count();
            
        return [
            'courses_enrolled' => $coursesEnrolled,
            'courses_completed' => $coursesCompleted,
            'lessons_completed' => $lessonsCompleted,
            'watch_time_seconds' => $watchTime,
            'meetings_attended' => $meetingsAttended,
            'webinars_attended' => $webinarsAttended,
        ];
    }

    /**
     * Calculate comparison between current and previous week
     */
    private function calculateComparison(array $current, array $previous): array
    {
        $comparison = [];
        $metrics = ['courses_enrolled', 'courses_completed', 'lessons_completed', 
                    'watch_time_seconds', 'meetings_attended', 'webinars_attended'];
                    
        foreach ($metrics as $metric) {
            $currentVal = $current[$metric];
            $previousVal = $previous[$metric];
            
            $comparison[$metric] = [
                'current' => $currentVal,
                'previous' => $previousVal,
                'change' => $previousVal > 0 ? round((($currentVal - $previousVal) / $previousVal) * 100) : ($currentVal > 0 ? 100 : 0),
                'trend' => $currentVal > $previousVal ? 'up' : ($currentVal < $previousVal ? 'down' : 'same'),
            ];
        }
        
        return $comparison;
    }

    /**
     * Generate a friendly status message
     */
    private function generateStatusMessage(array $metrics, array $comparison): string
    {
        $messages = [];
        
        if ($metrics['courses_completed'] > 0) {
            $messages[] = "🎉 You completed {$metrics['courses_completed']} course" . 
                         ($metrics['courses_completed'] > 1 ? 's' : '') . " this week!";
        }
        
        if ($metrics['lessons_completed'] > 5) {
            $messages[] = "📚 You completed {$metrics['lessons_completed']} lessons - great progress!";
        }
        
        if ($metrics['watch_time_seconds'] > 3600) {
            $hours = floor($metrics['watch_time_seconds'] / 3600);
            $messages[] = "⏱️ You spent {$hours} hour" . ($hours > 1 ? 's' : '') . " learning this week!";
        }
        
        if ($metrics['meetings_attended'] > 0 || $metrics['webinars_attended'] > 0) {
            $total = $metrics['meetings_attended'] + $metrics['webinars_attended'];
            $messages[] = "🤝 You attended {$total} session" . ($total > 1 ? 's' : '');
        }
        
        // Check if this is a good or bad week compared to previous
        $trends = array_column($comparison, 'trend');
        $upCount = count(array_filter($trends, fn($t) => $t === 'up'));
        
        if ($upCount >= 4 && count($messages) > 0) {
            return "🌟 Amazing week! " . implode(' ', $messages) . " Keep up the momentum!";
        }
        
        if (empty($messages)) {
            return "💪 This week was quiet. Let's make next week more productive!";
        }
        
        return implode(' ', $messages);
    }

    /**
     * Generate next week goals based on current metrics
     */
    private function generateNextWeekGoals(array $metrics): string
    {
        $goals = [];
        
        // Set goals to improve from this week
        if ($metrics['courses_completed'] < 1) {
            $goals[] = "Complete at least 1 course";
        }
        
        if ($metrics['lessons_completed'] < 3) {
            $goals[] = "Complete at least 3 lessons";
        }
        
        if ($metrics['watch_time_seconds'] < 1800) { // 30 minutes
            $goals[] = "Spend at least 30 minutes learning";
        }
        
        if ($metrics['webinars_attended'] < 1) {
            $goals[] = "Attend at least 1 webinar";
        }
        
        if (empty($goals)) {
            $goals[] = "Continue your excellent progress! 🚀";
        }
        
        return implode(' • ', $goals);
    }

    /**
     * Get the start of the current week (Saturday)
     */
    private function getWeekStart(): Carbon
    {
        return Carbon::now()->startOfWeek(Carbon::SATURDAY);
    }

    /**
     * Generate reports for all users
     */
    public function generateAllReports(): int
    {
        $users = User::whereIn('role', ['learner', 'admin'])
            ->where('status', 'active')
            ->get();
        $count = 0;
        
        foreach ($users as $user) {
            $this->generateReport($user->id);
            $count++;
        }
        
        return $count;
    }
}