<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClaritySnapshot;
use App\Support\ClarityHttpClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GoogleAnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $selectedDateRange = $request->input('date_range');

        if (!$fromDate || !$toDate) {
            $today = \Carbon\Carbon::today('Europe/London')->format('Y-m-d');
            $fromDate = $today;
            $toDate = $today;
        }

        $snapshots = ClaritySnapshot::whereBetween('snapshot_date', [$fromDate, $toDate])
            ->orderBy('snapshot_date', 'asc')
            ->get();

        $latest = ClaritySnapshot::whereBetween('snapshot_date', [$fromDate, $toDate])
            ->orderBy('snapshot_date', 'desc')
            ->first();

        $availableDates = ClaritySnapshot::select('snapshot_date')
            ->whereNotNull('snapshot_date')
            ->distinct()
            ->orderBy('snapshot_date', 'desc')
            ->get()
            ->map(function ($snapshot) {
                return [
                    'value' => $snapshot->snapshot_date,
                    'label' => \Carbon\Carbon::parse($snapshot->snapshot_date)->format('M d, Y'),
                ];
            })
            ->toArray();

        $analyticsData = [];

        if ($snapshots->count() > 0) {
            $snapshotIds = $snapshots->pluck('id')->toArray();

            $trafficData = DB::table('clarity_traffic')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('
                    SUM(total_session_count) as total_session_count,
                    SUM(total_bot_session_count) as total_bot_session_count,
                    SUM(distinct_user_count) as distinct_user_count,
                    AVG(pages_per_session_percentage) as pages_per_session_percentage
                ')
                ->first();

            if ($trafficData && $trafficData->total_session_count > 0) {
                $analyticsData[] = [
                    'metricName' => 'Traffic',
                    'information' => [[
                        'totalSessionCount' => (string) $trafficData->total_session_count,
                        'totalBotSessionCount' => (string) $trafficData->total_bot_session_count,
                        'distinctUserCount' => (string) $trafficData->distinct_user_count,
                        'pagesPerSessionPercentage' => (float) round($trafficData->pages_per_session_percentage, 2),
                    ]],
                ];
            }

            $engData = DB::table('clarity_engagement_time')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('SUM(total_time) as total_time, SUM(active_time) as active_time')
                ->first();

            if ($engData && ($engData->total_time > 0 || $engData->active_time > 0)) {
                $analyticsData[] = [
                    'metricName' => 'EngagementTime',
                    'information' => [[
                        'totalTime' => (string) $engData->total_time,
                        'activeTime' => (string) $engData->active_time,
                    ]],
                ];
            }

            $scrollData = DB::table('clarity_scroll_depth')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('AVG(average_scroll_depth) as average_scroll_depth')
                ->first();

            if ($scrollData && $scrollData->average_scroll_depth !== null) {
                $analyticsData[] = [
                    'metricName' => 'ScrollDepth',
                    'information' => [[
                        'averageScrollDepth' => (float) round($scrollData->average_scroll_depth, 2),
                    ]],
                ];
            }

            foreach ([
                'Browser' => 'clarity_browsers',
                'Device' => 'clarity_devices',
                'OS' => 'clarity_oses',
                'Country' => 'clarity_countries',
            ] as $metricName => $table) {
                $rows = DB::table($table)
                    ->whereIn('snapshot_id', $snapshotIds)
                    ->selectRaw('name, SUM(sessions_count) as sessions_count')
                    ->groupBy('name')
                    ->orderByDesc('sessions_count')
                    ->get();

                if ($rows->count()) {
                    $analyticsData[] = [
                        'metricName' => $metricName,
                        'information' => $rows->map(fn ($r) => [
                            'name' => $r->name,
                            'sessionsCount' => (string) $r->sessions_count,
                        ])->toArray(),
                    ];
                }
            }

            $referrers = DB::table('clarity_referrers')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('name, SUM(sessions_count) as sessions_count')
                ->groupBy('name')
                ->orderByDesc('sessions_count')
                ->get();

            if ($referrers->count()) {
                $analyticsData[] = [
                    'metricName' => 'ReferrerUrl',
                    'information' => $referrers->map(fn ($r) => [
                        'name' => $r->name,
                        'sessionsCount' => (string) $r->sessions_count,
                    ])->toArray(),
                ];
            }

            $pages = DB::table('clarity_popular_pages')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('url, SUM(visits_count) as visits_count')
                ->groupBy('url')
                ->orderByDesc('visits_count')
                ->get();

            if ($pages->count()) {
                $analyticsData[] = [
                    'metricName' => 'PopularPages',
                    'information' => $pages->map(fn ($r) => [
                        'url' => $r->url,
                        'visitsCount' => (string) $r->visits_count,
                    ])->toArray(),
                ];
            }

            $events = DB::table('clarity_engagement_events')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('
                    metric_name,
                    SUM(sessions_count) as sessions_count,
                    AVG(sessions_with_metric_percentage) as sessions_with_metric_percentage,
                    AVG(sessions_without_metric_percentage) as sessions_without_metric_percentage,
                    SUM(pages_views) as pages_views,
                    SUM(sub_total) as sub_total
                ')
                ->groupBy('metric_name')
                ->get();

            foreach ($events as $event) {
                $analyticsData[] = [
                    'metricName' => $event->metric_name,
                    'information' => [[
                        'sessionsCount' => (string) ($event->sessions_count ?? 0),
                        'sessionsWithMetricPercentage' => $event->sessions_with_metric_percentage !== null
                            ? (float) round($event->sessions_with_metric_percentage, 2) : 0,
                        'sessionsWithoutMetricPercentage' => $event->sessions_without_metric_percentage !== null
                            ? (float) round($event->sessions_without_metric_percentage, 2) : 0,
                        'pagesViews' => (string) ($event->pages_views ?? 0),
                        'subTotal' => (string) ($event->sub_total ?? 0),
                    ]],
                ];
            }
        }

        return response()->json([
            'analyticsData' => $analyticsData,
            'error' => null,
            'lastFetchedAt' => $latest?->last_fetched_at,
            'selectedDateRange' => $selectedDateRange,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'availableDates' => $availableDates,
        ]);
    }

    public function fetchAndStore(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $request->validate([
            'date' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'force' => 'nullable|boolean',
        ]);

        try {
            $apiUrl = config('clarity.api_url');
            $apiToken = config('clarity.api_token');

            if (!empty($apiUrl) && !str_starts_with($apiUrl, 'http')) {
                $apiUrl = 'https://' . $apiUrl;
            }

            if (empty($apiUrl) || empty($apiToken)) {
                return response()->json(['success' => false, 'message' => 'API credentials not configured'], 422);
            }

            $snapshotDate = $request->input('date')
                ? \Carbon\Carbon::parse($request->input('date'), 'Europe/London')->format('Y-m-d')
                : now('Europe/London')->format('Y-m-d');

            $force = $request->boolean('force', true);
            $numOfDays = (int) config('clarity.num_of_days', 1);
            if (!in_array($numOfDays, [1, 2, 3], true)) {
                $numOfDays = 1;
            }

            $response = null;
            $lastError = null;
            $maxRetries = 3;

            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                try {
                    $response = ClarityHttpClient::client()
                        ->timeout(30)
                        ->retry(2, 100)
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . $apiToken,
                            'Content-Type' => 'application/json',
                        ])->get($apiUrl, [
                            'numOfDays' => $numOfDays,
                        ]);

                    if ($response->successful()) {
                        break;
                    }

                    $lastError = 'HTTP ' . $response->status() . ': ' . \Illuminate\Support\Str::limit($response->body(), 500);
                    if ($attempt < $maxRetries) {
                        sleep($attempt * 2);
                    }
                } catch (\Exception $e) {
                    $lastError = $e->getMessage();
                    if ($attempt < $maxRetries) {
                        sleep($attempt * 2);
                    }
                }
            }

            if (!$response || !$response->successful()) {
                Log::error('Clarity API error after retries', [
                    'error' => $lastError,
                    'url' => $apiUrl,
                    'numOfDays' => $numOfDays,
                    'status' => $response?->status(),
                    'body' => $response?->body(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'API request failed after retries',
                ], 502);
            }

            $data = $response->json();

            if (!is_array($data) || empty($data)) {
                Log::error('Clarity API returned invalid data', ['data' => $data]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid API response',
                ], 502);
            }

            $hasValidMetric = false;
            foreach ($data as $item) {
                if (isset($item['metricName']) && isset($item['information'])) {
                    $hasValidMetric = true;
                    break;
                }
            }

            if (!$hasValidMetric) {
                Log::error('Clarity API response missing required fields', ['data' => $data]);
                return response()->json([
                    'success' => false,
                    'message' => 'API response missing required structure',
                ], 502);
            }

            $existingSnapshot = ClaritySnapshot::where('snapshot_date', $snapshotDate)->first();
            if ($existingSnapshot && !$force) {
                return response()->json([
                    'success' => false,
                    'message' => 'Snapshot already exists for ' . $snapshotDate,
                ], 409);
            }

            if ($existingSnapshot && $force) {
                $existingSnapshot->delete();
                Log::info('Deleted existing snapshot for force refresh', ['date' => $snapshotDate]);
            }

            DB::transaction(function () use ($data, $snapshotDate) {
                $timestamp = now('Europe/London');

                $snapshot = ClaritySnapshot::create([
                    'payload' => $data,
                    'last_fetched_at' => $timestamp,
                    'snapshot_date' => $snapshotDate,
                ]);

                $find = function (string $metricName) use ($data) {
                    foreach ($data as $item) {
                        if (($item['metricName'] ?? null) === $metricName) {
                            return $item['information'] ?? [];
                        }
                    }
                    return [];
                };

                $traffic = $find('Traffic');
                if (!empty($traffic)) {
                    $t = $traffic[0];
                    DB::table('clarity_traffic')->insert([
                        'snapshot_id' => $snapshot->id,
                        'total_session_count' => (int) ($t['totalSessionCount'] ?? 0),
                        'total_bot_session_count' => (int) ($t['totalBotSessionCount'] ?? 0),
                        'distinct_user_count' => (int) ($t['distinctUserCount'] ?? 0),
                        'pages_per_session_percentage' => (float) ($t['pagesPerSessionPercentage'] ?? 0),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                $eng = $find('EngagementTime');
                if (!empty($eng)) {
                    $e = $eng[0];
                    DB::table('clarity_engagement_time')->insert([
                        'snapshot_id' => $snapshot->id,
                        'total_time' => (int) ($e['totalTime'] ?? 0),
                        'active_time' => (int) ($e['activeTime'] ?? 0),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                $scroll = $find('ScrollDepth');
                if (!empty($scroll)) {
                    $s = $scroll[0];
                    DB::table('clarity_scroll_depth')->insert([
                        'snapshot_id' => $snapshot->id,
                        'average_scroll_depth' => (float) ($s['averageScrollDepth'] ?? 0),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                foreach ([
                    'Browser' => 'clarity_browsers',
                    'Device' => 'clarity_devices',
                    'OS' => 'clarity_oses',
                    'Country' => 'clarity_countries',
                ] as $metric => $table) {
                    $rows = $find($metric);
                    $batch = [];
                    foreach ($rows as $row) {
                        $batch[] = [
                            'snapshot_id' => $snapshot->id,
                            'name' => $row['name'] ?? null,
                            'sessions_count' => (int) ($row['sessionsCount'] ?? 0),
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                    if (!empty($batch)) {
                        DB::table($table)->insert($batch);
                    }
                }

                $referrers = $find('ReferrerUrl');
                if (!empty($referrers)) {
                    $batch = [];
                    foreach ($referrers as $r) {
                        $batch[] = [
                            'snapshot_id' => $snapshot->id,
                            'name' => $r['name'] ?? null,
                            'sessions_count' => (int) ($r['sessionsCount'] ?? 0),
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                    DB::table('clarity_referrers')->insert($batch);
                }

                $pages = $find('PopularPages');
                if (!empty($pages)) {
                    $batch = [];
                    foreach ($pages as $p) {
                        $batch[] = [
                            'snapshot_id' => $snapshot->id,
                            'url' => $p['url'] ?? '',
                            'visits_count' => (int) ($p['visitsCount'] ?? 0),
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                    DB::table('clarity_popular_pages')->insert($batch);
                }

                foreach (['DeadClickCount', 'RageClickCount', 'QuickbackClick', 'ScriptErrorCount', 'ExcessiveScroll', 'ErrorClickCount'] as $metric) {
                    $rows = $find($metric);
                    if (!empty($rows)) {
                        $r = $rows[0];
                        DB::table('clarity_engagement_events')->insert([
                            'snapshot_id' => $snapshot->id,
                            'metric_name' => $metric,
                            'sessions_count' => (int) ($r['sessionsCount'] ?? 0),
                            'sessions_with_metric_percentage' => isset($r['sessionsWithMetricPercentage'])
                                ? (float) $r['sessionsWithMetricPercentage'] : null,
                            'sessions_without_metric_percentage' => isset($r['sessionsWithoutMetricPercentage'])
                                ? (float) $r['sessionsWithoutMetricPercentage'] : null,
                            'pages_views' => isset($r['pagesViews']) ? (int) $r['pagesViews'] : null,
                            'sub_total' => isset($r['subTotal']) ? (int) $r['subTotal'] : null,
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ]);
                    }
                }
            });

            return response()->json(['success' => true, 'message' => 'Analytics data saved']);
        } catch (\Exception $e) {
            Log::error('Clarity fetch exception', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error occurred'], 500);
        }
    }
}
