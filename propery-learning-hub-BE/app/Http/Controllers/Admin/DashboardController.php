<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Content;
use App\Models\Course;
use App\Models\Deal;
use App\Support\ContentMetrics;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $range = $request->query('range', '30days');

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
        $previousEnd = $startDate;

        return response()->json([
            'success' => true,
            'data' => [
                'stats'               => $this->getStats($startDate, $previousStart, $previousEnd),
                'key_metrics'         => $this->getKeyMetrics(),
                'top_content'         => $this->getTopContent(),
                'recent_deals'        => $this->getRecentDeals(),
                'quick_actions'       => $this->getQuickActionCounts(),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Stats Cards  (Total Users | Video Content | Documents | Active Deals)
    // -------------------------------------------------------------------------
    private function getStats($startDate, $previousStart, $previousEnd): array
    {
        // ── Users ──────────────────────────────────────────────────────────
        $totalUsers    = User::count();
        $prevUsers     = User::where('created_at', '<', $startDate)->count();
        $userGrowth    = $this->growthPercent($prevUsers, $totalUsers);

        // ── Video Content ──────────────────────────────────────────────────
        $contentCounts = ContentMetrics::counts(auth()->user());
        $totalVideos   = $contentCounts['videos'];
        $totalDocs     = $contentCounts['documents'];

        $videoQuery  = ContentMetrics::query()->where('type', 'video');
        $prevVideos  = (clone $videoQuery)->where('created_at', '<', $startDate)->count();
        $videoGrowth = $this->growthPercent($prevVideos, $totalVideos);

        $documentQuery = ContentMetrics::query()->where('type', 'document');
        $prevDocs      = (clone $documentQuery)->where('created_at', '<', $startDate)->count();
        $docGrowth     = $this->growthPercent($prevDocs, $totalDocs);

        // ── Active Deals ──────────────────────────────────────────────────
        $activeDeals   = Deal::published()->count();
        $prevDeals     = Deal::published()
                             ->where('published_at', '<', $startDate)->count();
        $dealsGrowth   = $this->growthPercent($prevDeals, $activeDeals);

        return [
            'total_users'    => [
                'value'  => $totalUsers,
                'change' => $userGrowth,
            ],
            'video_content'  => [
                'value'  => $totalVideos,
                'change' => $videoGrowth,
            ],
            'documents'      => [
                'value'  => $totalDocs,
                'change' => $docGrowth,
            ],
            'active_deals'   => [
                'value'  => $activeDeals,
                'change' => $dealsGrowth,
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Key Metrics  (Active Courses | Today Revenue | New Users 24h | Active Deals)
    // -------------------------------------------------------------------------
    private function getKeyMetrics(): array
    {
        return [
            'active_courses'  => Course::where('is_active', true)->count(),
            'today_revenue'   => 0, // hook up payments when ready
            'new_users_24h'   => User::where('created_at', '>=', now()->subDay())->count(),
            'active_deals'    => Deal::published()->count(),
        ];
    }

    // -------------------------------------------------------------------------
    // Top Performing Content  (top 4 by views - only content that belongs to a course)
    // -------------------------------------------------------------------------
    private function getTopContent(): array
    {
        // Use ContentMetrics query to ensure we only get content that belongs to a course
        $items = ContentMetrics::query()
            ->where('is_published', true)
            ->orderBy('views', 'desc')
            ->take(4)
            ->get();

        return $items->map(function (Content $content) {
            // Calculate a realistic previous views based on content age
            $previousViews = $this->calculatePreviousViews($content);
            
            return [
                'id'        => $content->id,
                'title'     => $content->title,
                'type'      => $content->type,
                'course_id' => $content->course_id,
                'views'     => $content->views,
                'trend'     => $content->views >= $previousViews ? 'up' : 'down',
            ];
        })->toArray();
    }

    // -------------------------------------------------------------------------
    // Recent Deals  (latest 3 published deals)
    // -------------------------------------------------------------------------
    private function getRecentDeals(): array
    {
        return Deal::published()
            ->orderBy('published_at', 'desc')
            ->take(3)
            ->get()
            ->map(fn (Deal $deal) => [
                'id'       => $deal->id,
                'title'    => $deal->title,
                'location' => $deal->location,
                'price'    => $deal->price === null
                    ? '—'
                    : '£' . number_format((float) $deal->price, 0, '.', ','),
                'views'    => $deal->views,
            ])
            ->toArray();
    }

    // -------------------------------------------------------------------------
    // Quick Action Counts  (badge numbers on quick action buttons)
    // -------------------------------------------------------------------------
    private function getQuickActionCounts(): array
    {
        return [
            'pending_users'    => User::where('status', 'pending')->count(),
            'draft_deals'      => Deal::where('status', Deal::STATUS_DRAFT)->count(),
            'unpublished_content' => ContentMetrics::query()->where('is_published', false)->count(),
        ];
    }

    // -------------------------------------------------------------------------
    // Helper: calculate growth percentage string  e.g. "+12%" / "-3%"
    // -------------------------------------------------------------------------
    private function growthPercent(int $previous, int $current): string
    {
        if ($previous === 0) {
            return $current > 0 ? '+100%' : '0%';
        }

        $pct = round((($current - $previous) / $previous) * 100);

        return ($pct >= 0 ? '+' : '') . $pct . '%';
    }

    // -------------------------------------------------------------------------
    // Helper: calculate previous views for trend analysis
    // -------------------------------------------------------------------------
    private function calculatePreviousViews(Content $content): int
    {
        if ($content->views === 0) {
            return 0;
        }

        // Get the age of the content in days
        $daysSinceCreation = max(1, now()->diffInDays($content->created_at));
        
        // Calculate average daily views
        $dailyViews = $content->views / $daysSinceCreation;
        
        // Subtract approximately 7 days of views to get previous views
        $previousViews = max(0, $content->views - ($dailyViews * 7));
        
        // If the content is very new (less than 7 days old), use a more conservative estimate
        if ($daysSinceCreation < 7) {
            $previousViews = (int) round($content->views * 0.5);
        }
        
        return (int) round($previousViews);
    }
}