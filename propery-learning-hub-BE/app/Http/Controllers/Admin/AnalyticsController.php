<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactCourse;
use App\Models\Content;
use App\Models\CourseEnrollment;
use App\Models\Membership;
use App\Models\User;
use App\Models\LessonProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        [$startDate, $previousStart, $previousEnd, $range] = $this->resolveRange($request->query('range', '30days'));

        return response()->json([
            'success' => true,
            'data'    => [
                'range'               => $range,
                'stats'               => $this->overviewStats($startDate, $previousStart, $previousEnd),
                'user_growth'         => $this->userGrowth($startDate, $range),
                'content_engagement'  => $this->contentEngagement(),
                'top_content'         => $this->topContent(),
                'user_activity'       => $this->userActivity($startDate, $previousStart, $previousEnd),
                'crm_summary'         => $this->crmSummary($startDate),
            ],
        ]);
    }

    private function resolveRange(string $range): array
    {
        $startDate = match ($range) {
            '7days'  => now()->subDays(7),
            '90days' => now()->subDays(90),
            '1year'  => now()->subYear(),
            default  => now()->subDays(30),
        };

        $previousStart = match ($range) {
            '7days'  => now()->subDays(14),
            '90days' => now()->subDays(180),
            '1year'  => now()->subYears(2),
            default  => now()->subDays(60),
        };

        return [$startDate, $previousStart, $startDate->copy(), $range];
    }

    private function overviewStats($startDate, $previousStart, $previousEnd): array
    {
        // ── Active Users ──────────────────────────────────────────────
        $activeUsers = User::where('status', 'active')->count();
        $prevActiveUsers = User::where('status', 'active')
            ->where('created_at', '<', $startDate)
            ->count();

        // ── Content Views (only content that belongs to a course) ──
        $contentViews = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->sum('views');
        
        $prevContentViews = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->where('created_at', '<', $startDate)
            ->sum('views');

        // ── Video Watch Time ──────────────────────────────────────────
        $totalWatchSeconds = LessonProgress::sum('watch_time') ?? 0;
        $prevWatchSeconds = LessonProgress::where('updated_at', '<', $startDate)
            ->sum('watch_time') ?? 0;

        if ($totalWatchSeconds < 3600) {
            $watchValue = round($totalWatchSeconds / 60, 0) . 'm';
        } else {
            $watchValue = round($totalWatchSeconds / 3600, 1) . 'h';
        }

        // ── Document Downloads (only documents that belong to a course) ──
        $downloads = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->where('type', 'document')
            ->sum('downloads');
        
        $prevDownloads = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->where('type', 'document')
            ->where('created_at', '<', $startDate)
            ->sum('downloads');

        return [
            'active_users' => [
                'value'      => $activeUsers,
                'change'     => $this->growthPercent($prevActiveUsers, $activeUsers),
                'is_positive' => $activeUsers >= $prevActiveUsers,
            ],
            'content_views' => [
                'value'       => $contentViews,
                'change'      => $this->growthPercent($prevContentViews, $contentViews),
                'is_positive' => $contentViews >= $prevContentViews,
            ],
            'video_watch_time' => [
                'value'       => $watchValue,
                'raw_hours'   => (float) round($totalWatchSeconds / 3600, 2),
                'change'      => $this->growthPercent($prevWatchSeconds, $totalWatchSeconds),
                'is_positive' => $totalWatchSeconds >= $prevWatchSeconds,
            ],
            'document_downloads' => [
                'value'       => $downloads,
                'change'      => $this->growthPercent($prevDownloads, $downloads),
                'is_positive' => $downloads >= $prevDownloads,
            ],
        ];
    }

    private function userGrowth($startDate, string $range): array
    {
        $points = match ($range) {
            '7days'  => 7,
            '30days' => 30,
            '90days' => 12,
            '1year'  => 12,
            default  => 30,
        };

        $data = [];
        for ($i = $points - 1; $i >= 0; $i--) {
            if ($range === '1year') {
                $from = now()->subMonths($i + 1)->startOfMonth();
                $to   = now()->subMonths($i)->endOfMonth();
                $label = $from->format('M Y');
                $count = User::whereBetween('created_at', [$from, $to])->count();
            } elseif ($range === '90days') {
                $from = now()->subDays(($i + 1) * 7);
                $to   = now()->subDays($i * 7);
                $label = $to->format('d M');
                $count = User::whereBetween('created_at', [$from, $to])->count();
            } else {
                $date  = now()->subDays($i);
                $label = $date->format('d M');
                $count = User::whereDate('created_at', $date)->count();
            }
            $data[] = ['label' => $label, 'count' => $count];
        }

        $max = max(array_column($data, 'count')) ?: 1;

        return array_map(fn ($d) => [
            'label'      => $d['label'],
            'count'      => $d['count'],
            'percentage' => round(($d['count'] / $max) * 100),
        ], $data);
    }

    private function contentEngagement(): array
    {
        // Only count content that belongs to a course
        $videoViews = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->where('type', 'video')
            ->sum('views');
            
        $documentViews = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->where('type', 'document')
            ->sum('views');
            
        $documentDl = Content::whereNotNull('course_id')
            ->whereHas('course')
            ->where('type', 'document')
            ->sum('downloads');
            
        $total = $videoViews + $documentViews + $documentDl ?: 1;

        // Calculate percentages based on actual data
        $videoPercent = round(($videoViews / $total) * 100);
        $docViewPercent = round(($documentViews / $total) * 100);
        $dlPercent = round(($documentDl / $total) * 100);
        
        // Ensure total is 100%
        $sum = $videoPercent + $docViewPercent + $dlPercent;
        if ($sum > 100) {
            $videoPercent = $videoPercent - ($sum - 100);
        } elseif ($sum < 100) {
            // Add remaining percentage to the largest category
            $diff = 100 - $sum;
            $largest = max($videoPercent, $docViewPercent, $dlPercent);
            if ($largest === $videoPercent) {
                $videoPercent += $diff;
            } elseif ($largest === $docViewPercent) {
                $docViewPercent += $diff;
            } else {
                $dlPercent += $diff;
            }
        }

        return [
            [
                'label' => 'Video Views', 
                'value' => (int) $videoViews, 
                'percentage' => $videoPercent, 
                'color' => '#3b82f6'
            ],
            [
                'label' => 'Document Views', 
                'value' => (int) $documentViews, 
                'percentage' => $docViewPercent, 
                'color' => '#10b981'
            ],
            [
                'label' => 'Downloads', 
                'value' => (int) $documentDl, 
                'percentage' => $dlPercent, 
                'color' => '#f59e0b'
            ],
        ];
    }

    private function topContent(): array
    {
        // Only get content that belongs to a course
        return Content::where('is_published', true)
            ->whereNotNull('course_id')
            ->whereHas('course')
            ->orderByDesc('views')
            ->take(10)
            ->get()
            ->map(function (Content $content) {
                $completion = 0;
                if ($content->course_id) {
                    $avg = CourseEnrollment::where('course_id', $content->course_id)
                        ->avg('progress_percentage');
                    $completion = (int) round($avg ?? 0);
                }

                return [
                    'id'         => $content->id,
                    'title'      => $content->title,
                    'type'       => $content->type === 'video' ? 'Video' : 'Document',
                    'views'      => $content->views,
                    'completion' => $completion,
                ];
            })
            ->toArray();
    }

    private function userActivity($startDate, $previousStart, $previousEnd): array
    {
        // ── New Registrations ──────────────────────────────────────────
        $newRegistrations = User::where('created_at', '>=', $startDate)->count();
        $prevRegistrations = User::whereBetween('created_at', [$previousStart, $previousEnd])->count();

        // ── Active Users ───────────────────────────────────────────────
        $activeUsers = User::where('status', 'active')->count();
        $prevActive = User::where('status', 'active')
            ->where('created_at', '<', $startDate)
            ->count();

        // ── Weekly Active Users ────────────────────────────────────────
        $weeklyActive = User::where('last_login_at', '>=', now()->subWeek())->count();
        $prevWeeklyActive = User::whereBetween('last_login_at', [now()->subWeeks(2), now()->subWeek()])->count();

        // ── Monthly Retention ──────────────────────────────────────────
        $monthlyUsers = User::where('created_at', '<=', now()->subMonth())->count();
        $retainedUsers = User::where('created_at', '<=', now()->subMonth())
            ->where('last_login_at', '>=', now()->subMonth())
            ->count();
        $retentionRate = $monthlyUsers > 0 ? round(($retainedUsers / $monthlyUsers) * 100) : 0;
        
        // Calculate previous retention rate
        $prevMonthlyUsers = User::where('created_at', '<=', now()->subMonths(2))->count();
        $prevRetainedUsers = User::where('created_at', '<=', now()->subMonths(2))
            ->where('last_login_at', '>=', now()->subMonths(2))
            ->where('last_login_at', '<', now()->subMonth())
            ->count();
        $prevRetentionRate = $prevMonthlyUsers > 0 ? round(($prevRetainedUsers / $prevMonthlyUsers) * 100) : 0;

        // ── Course Completion Rate ─────────────────────────────────────
        $totalEnrollments = CourseEnrollment::count();
        $completedEnrollments = CourseEnrollment::where('status', 'completed')
            ->orWhere('progress_percentage', '>=', 100)
            ->count();
        $avgCompletion = $totalEnrollments > 0 ? round(($completedEnrollments / $totalEnrollments) * 100) : 0;
        
        // Calculate previous completion rate
        $prevTotalEnrollments = CourseEnrollment::where('created_at', '<', $startDate)->count();
        $prevCompletedEnrollments = CourseEnrollment::where('created_at', '<', $startDate)
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhere('progress_percentage', '>=', 100);
            })
            ->count();
        $prevAvgCompletion = $prevTotalEnrollments > 0 ? round(($prevCompletedEnrollments / $prevTotalEnrollments) * 100) : 0;

        return [
            [
                'metric' => 'New Registrations',
                'value' => $newRegistrations,
                'change' => $this->growthPercent($prevRegistrations, $newRegistrations),
                'is_positive' => $newRegistrations >= $prevRegistrations,
            ],
            [
                'metric' => 'Active Users',
                'value' => $activeUsers,
                'change' => $this->growthPercent($prevActive, $activeUsers),
                'is_positive' => $activeUsers >= $prevActive,
            ],
            [
                'metric' => 'Weekly Active Users',
                'value' => $weeklyActive,
                'change' => $this->growthPercent($prevWeeklyActive, $weeklyActive),
                'is_positive' => $weeklyActive >= $prevWeeklyActive,
            ],
            [
                'metric' => 'Monthly Retention',
                'value' => $retentionRate . '%',
                'change' => $this->growthPercent($prevRetentionRate, $retentionRate),
                'is_positive' => $retentionRate >= $prevRetentionRate,
            ],
            [
                'metric' => 'Course Completion Rate',
                'value' => $avgCompletion . '%',
                'change' => $this->growthPercent($prevAvgCompletion, $avgCompletion),
                'is_positive' => $avgCompletion >= $prevAvgCompletion,
            ],
        ];
    }

    private function crmSummary($startDate): array
    {
        // Only count course revenue where course and contact exist
        $courseRevenue = ContactCourse::whereHas('course')
            ->whereHas('contact')
            ->where('purchase_date', '>=', $startDate)
            ->sum('amount_paid');
            
        // Only count membership revenue where contact exists
        $membershipRevenue = Membership::whereHas('contact')
            ->where('created_at', '>=', $startDate)
            ->sum('amount');

        return [
            'total_contacts' => Contact::count(),
            'new_contacts' => Contact::where('created_at', '>=', $startDate)->count(),
            'active_memberships' => Membership::where('status', 'active')
                ->whereHas('contact') // Only count if contact exists
                ->count(),
            'course_sales' => ContactCourse::whereHas('course')
                ->whereHas('contact')
                ->where('purchase_date', '>=', $startDate)
                ->count(),
            'total_revenue' => (float) ($courseRevenue + $membershipRevenue),
            'leads' => Contact::whereHas('classifications', fn ($q) => $q->where('classification', 'lead'))->count(),
        ];
    }

    private function growthPercent(int $previous, int $current): string
    {
        if ($previous === 0) {
            return $current > 0 ? '+100%' : '0%';
        }
        $pct = round((($current - $previous) / $previous) * 100);

        return ($pct >= 0 ? '+' : '') . $pct . '%';
    }
}