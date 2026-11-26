<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Support\HumanTime;
use App\Support\MediaUrl;
use App\Models\Content;
use App\Models\ContentCategory;
use App\Models\ContractPurchase;
use App\Models\ContractTemplate;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Deal;
use App\Models\LessonProgress;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use App\Models\MeetingRegistration;
use App\Models\Notification;
use App\Models\PlatformMeeting;
use App\Models\Webinar;
use App\Models\WebinarRegistration;
use App\Support\LearnerNotificationDismissals;
use App\Support\PlatformMeetingParticipantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    /**
     * GET /api/learner/dashboard
     *
     * Returns the full aggregated dashboard payload in one request:
     *   - stats (course progress, meetings, saved deals, unread notifications)
     *   - recent video lessons (with progress)
     *   - upcoming webinars / meetings
     *   - recent deals
     *   - contract template previews
     *   - recent notifications / updates
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $userId = $user->id;
        $cacheKey = "learner_dashboard_v2_{$userId}";

        try {
            $data = Cache::remember($cacheKey, 120, function () use ($userId, $user) {
                return $this->buildDashboardPayload($userId, $user);
            });
        } catch (\Throwable $exception) {
            Log::error('Learner dashboard failed to build payload', [
                'user_id' => $userId,
                'message' => $exception->getMessage(),
            ]);

            Cache::forget($cacheKey);

            try {
                $data = $this->buildDashboardPayload($userId, $user);
            } catch (\Throwable $fallbackException) {
                Log::error('Learner dashboard fallback build failed', [
                    'user_id' => $userId,
                    'message' => $fallbackException->getMessage(),
                ]);

                $data = $this->emptyDashboardPayload();
            }
        }

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    /**
     * GET /api/learner/dashboard/stats
     * Lightweight endpoint for the 4 stat cards only.
     */
    public function stats(): JsonResponse
    {
        $userId = Auth::id();

        return response()->json([
            'success' => true,
            'data'    => $this->buildStats($userId),
        ]);
    }

    /**
     * GET /api/learner/dashboard/activity
     * Returns recent activity / notifications feed.
     */
    public function activity(): JsonResponse
    {
        $userId = Auth::id();

        return response()->json([
            'success' => true,
            'data'    => $this->buildNotifications($userId),
        ]);
    }

    // =========================================================================
    // PRIVATE BUILDERS
    // =========================================================================

    private function buildDashboardPayload(int $userId, \App\Models\User $user): array
    {
        $notifications = $this->safeSection(
            'notifications',
            fn () => $this->buildNotifications($userId),
            []
        );

        return [
            'stats'              => $this->safeSection('stats', fn () => $this->buildStats($userId, $notifications), $this->emptyStats()),
            'videoLessons'       => $this->safeSection('videoLessons', fn () => $this->buildVideoLessons($userId), []),
            'upcomingMeetings'   => $this->safeSection('upcomingMeetings', fn () => $this->buildUpcomingMeetings($userId), []),
            'upcomingWebinars'   => $this->safeSection('upcomingWebinars', fn () => $this->buildUpcomingWebinars($userId), []),
            'recentDeals'        => $this->safeSection('recentDeals', fn () => $this->buildRecentDeals(), []),
            'contractTemplates'  => $this->safeSection('contractTemplates', fn () => $this->buildContractTemplates($userId), []),
            'notifications'      => $notifications,
            'quickStats'         => $this->safeSection('quickStats', fn () => $this->buildQuickStats($userId), $this->emptyQuickStats()),
        ];
    }

    /**
     * The four summary stat cards shown at the top of the dashboard.
     */
    private function buildStats(int $userId, ?array $notifications = null): array
    {
        // ── Course Progress ──────────────────────────────────────────────
        $totalVideos = Content::published()
            ->where('type', 'video')
            ->whereHas('course', fn ($q) => $q->whereHas('enrollments', fn ($e) => $e->where('user_id', $userId)))
            ->count();

        $completedVideos = LessonProgress::where('user_id', $userId)
            ->where('is_completed', true)
            ->whereHas('content', fn ($q) => $q->where('type', 'video'))
            ->count();

        $courseProgress = $totalVideos > 0 ? round(($completedVideos / $totalVideos) * 100) : 0;

        // ── Meetings Booked ───────────────────────────────────────────────
        $user = \App\Models\User::find($userId);
        $legacyMeetings = MeetingRegistration::where('learner_id', $userId)
            ->whereIn('status', ['registered', 'confirmed'])
            ->whereHas('meeting', fn ($q) => $q->where('date', '>=', now()->startOfDay()))
            ->count();

        $legacyInvites = MeetingParticipant::where('user_id', $userId)
            ->whereIn('status', ['confirmed', 'pending'])
            ->whereHas('meeting', fn ($q) => $q->where('date', '>=', now()->startOfDay()))
            ->count();

        $platformMeetings = $this->countUpcomingPlatformMeetings($user);

        $totalMeetings = $legacyMeetings + $legacyInvites + $platformMeetings;

        // ── Saved / Bookmarked Deals ──────────────────────────────────────
        $savedDeals = 0;
        if (\Schema::hasTable('deal_favorites')) {
            $savedDeals = \DB::table('deal_favorites')
                ->where('user_id', $userId)
                ->count();
        }

        // ── Unread Notifications ──────────────────────────────────────────
        $totalNotifications  = $notifications ?? $this->buildNotifications($userId);
        $unreadNotifications = collect($totalNotifications)->where('read', false)->count();

        return [
            'courseProgress' => [
                'value'     => "{$courseProgress}%",
                'raw'       => $courseProgress,
                'trend'     => $this->progressTrend($userId),
                'label'     => 'Course Progress',
            ],
            'meetingsBooked' => [
                'value' => (string) $totalMeetings,
                'raw'   => $totalMeetings,
                'trend' => $totalMeetings > 0 ? 'Upcoming meetings' : 'No meetings booked',
                'label' => 'Meetings Booked',
            ],
            'savedDeals' => [
                'value' => (string) $savedDeals,
                'raw'   => $savedDeals,
                'trend' => 'Active',
                'label' => 'Saved Deals',
            ],
            'notifications' => [
                'value'  => (string) count($totalNotifications),
                'raw'    => count($totalNotifications),
                'unread' => $unreadNotifications,
                'trend'  => "Unread: {$unreadNotifications}",
                'label'  => 'New Updates',
            ],
        ];
    }

    /**
     * Quick stat numbers for the "Quick Access" link cards.
     */
    private function buildQuickStats(int $userId): array
    {
        $enrolledCourseIds = CourseEnrollment::where('user_id', $userId)
            ->pluck('course_id');

        $videoCount = Content::published()
            ->where('type', 'video')
            ->whereIn('course_id', $enrolledCourseIds)
            ->count();

        $upcomingWebinarCount = Webinar::query()
            ->whereIn('status', ['upcoming', 'live'])
            ->visibleToLearners()
            ->count();

        $newDealCount = Deal::published()
            ->where('published_at', '>=', now()->subDays(7))
            ->count();

        $templateCount = ContractTemplate::where('is_active', true)
            ->where(fn ($q) => $q->where('is_global', true)->orWhere('user_id', $userId))
            ->count();

        return [
            'latestVideoLessons' => $videoCount,
            'upcomingWebinars'   => $upcomingWebinarCount,
            'newDeals'           => $newDealCount,
            'contractTemplates'  => $templateCount,
        ];
    }

    /**
     * Last 5 video lessons across enrolled courses, including per-video progress.
     */
    private function buildVideoLessons(int $userId): array
    {
        $enrolledCourseIds = CourseEnrollment::where('user_id', $userId)->pluck('course_id');

        $videos = Content::published()
            ->with(['category', 'user', 'course'])
            ->where('type', 'video')
            ->whereIn('course_id', $enrolledCourseIds)
            ->orderBy('published_at', 'desc')
            ->limit(5)
            ->get();

        // Fetch progress for all these videos in one query
        $progressMap = LessonProgress::where('user_id', $userId)
            ->whereIn('content_id', $videos->pluck('id'))
            ->pluck('progress_percentage', 'content_id');

        return $videos->map(function ($video) use ($progressMap) {
            $instructor = optional($video->user);
            $instructorName = $instructor
                ? trim(($instructor->first_name ?? '') . ' ' . ($instructor->last_name ?? ''))
                : '';

            return [
                'id'         => $video->id,
                'title'      => $video->title,
                'instructor' => $instructorName !== '' ? $instructorName : 'Instructor',
                'duration'   => $video->duration ?? '—',
                'progress'   => (int) ($progressMap[$video->id] ?? 0),
                'category'   => optional($video->category)->name ?? 'General',
                'thumbnail'  => $video->thumbnail_path
                    ? MediaUrl::url($video->thumbnail_path)
                    : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop',
                'courseId'   => $video->course_id,
                'courseTitle' => optional($video->course)->title,
            ];
        })->toArray();
    }

    /**
     * Upcoming meetings (invites + registrations) for this learner — next 7 days.
     */
    private function buildUpcomingMeetings(int $userId): array
    {
        $now     = now();
        $oneWeek = now()->addDays(7);
        $user    = \App\Models\User::find($userId);

        // Direct participant invites
        $invited = MeetingParticipant::where('user_id', $userId)
            ->whereIn('status', ['confirmed', 'pending'])
            ->with(['meeting:id,title,date,time,status,type,meeting_link,instructor_id'])
            ->get()
            ->map(fn ($p) => $p->meeting)
            ->filter(fn ($m) => $m && $m->date && $m->date->startOfDay() >= $now->copy()->startOfDay() && $m->date <= $oneWeek);

        // Registered meetings
        $registered = MeetingRegistration::where('learner_id', $userId)
            ->whereIn('status', ['registered', 'confirmed'])
            ->with(['meeting:id,title,date,time,status,type,meeting_link,instructor_id'])
            ->get()
            ->map(fn ($r) => $r->meeting)
            ->filter(fn ($m) => $m && $m->date && $m->date->startOfDay() >= $now->copy()->startOfDay() && $m->date <= $oneWeek);

        $legacy = $invited->merge($registered)
            ->unique('id')
            ->map(fn ($m) => [
                'id'     => $m->id,
                'title'  => $m->title,
                'date'   => $m->date?->format('Y-m-d') ?? (string) $m->date,
                'time'   => $m->time,
                'type'   => $m->type,
                'status' => $m->status,
            ]);

        $platform = collect($this->buildUpcomingPlatformMeetings($user))
            ->map(fn (array $m) => [
                'id'     => 'platform_' . $m['id'],
                'title'  => $m['title'],
                'date'   => $m['date'],
                'time'   => $m['time'],
                'type'   => $m['type'],
                'status' => $m['status'],
            ]);

        return $legacy->merge($platform)
            ->sortBy('date')
            ->take(5)
            ->values()
            ->all();
    }

    /**
     * Upcoming webinars visible to the learner, with registration status attached.
     */
    private function buildUpcomingWebinars(int $userId): array
    {
        $registrations = WebinarRegistration::where('learner_id', $userId)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (WebinarRegistration $registration) => $registration->status !== 'cancelled')
            ->unique('webinar_id')
            ->keyBy('webinar_id');

        $webinars = Webinar::query()
            ->whereIn('status', ['upcoming', 'live'])
            ->visibleToLearners()
            ->with(['instructor:id,first_name,last_name'])
            ->orderBy('date')
            ->orderBy('time')
            ->limit(5)
            ->get();

        return $webinars->map(function (Webinar $webinar) use ($registrations) {
            $registration = $registrations->get($webinar->id);
            $instructor = optional($webinar->instructor);
            $instructorName = $instructor
                ? trim(($instructor->first_name ?? '') . ' ' . ($instructor->last_name ?? ''))
                : 'Instructor';

            return [
                'id'                 => $webinar->id,
                'title'              => $webinar->title,
                'date'               => $webinar->date?->format('Y-m-d') ?? (string) $webinar->date,
                'time'               => $webinar->time,
                'duration'           => $webinar->duration,
                'status'             => $webinar->status,
                'category'           => $webinar->category,
                'level'              => $webinar->level,
                'price'              => (float) $webinar->price,
                'instructor'         => $instructorName !== '' ? $instructorName : 'Instructor',
                'registrationStatus' => $registration?->status,
                'paymentStatus'      => $registration?->payment_status,
                'amountPaid'         => $registration?->amount_paid,
                'rejectionReason'    => $registration?->rejection_reason,
            ];
        })->values()->toArray();
    }

    /**
     * 3 most recently published deals.
     */
    private function buildRecentDeals(): array
    {
        $userId = Auth::id();
        $deals = Deal::published()
            ->orderBy('published_at', 'desc')
            ->limit(3)
            ->get();

        // Get user's favorite deal IDs
        $favoriteIds = [];
        if (Schema::hasTable('deal_favorites') && $userId) {
            $favoriteIds = \DB::table('deal_favorites')
                ->where('user_id', $userId)
                ->pluck('deal_id')
                ->toArray();
        }

        return $deals->map(fn ($deal) => [
                'id'           => $deal->id,
                'title'        => $deal->title,
                'location'     => $deal->location,
                'price'        => $deal->price
                    ? '£' . number_format($deal->price)
                    : 'Price on request',
                'roi'          => $deal->roi ? $deal->roi . '%' : '—',
                'capRate'      => '—',
                'status'       => 'Published',
                'propertyType' => $deal->property_type,
                'featured'     => (bool) $deal->featured,
                'saved'        => in_array($deal->id, $favoriteIds),
            ])
            ->toArray();
    }

    /**
     * First 4 active contract templates, with purchased flag per user.
     */
    private function buildContractTemplates(int $userId): array
    {
        $templates = ContractTemplate::where('is_active', true)
            ->where(fn ($q) => $q->where('is_global', true)->orWhere('user_id', $userId))
            ->orderByDesc('created_at')
            ->limit(4)
            ->get();

        $purchasedIds = [];
        if (Schema::hasTable('contract_purchases')) {
            $purchasedIds = ContractPurchase::where('user_id', $userId)
                ->where('status', 'completed')
                ->pluck('contract_template_id')
                ->toArray();
        }

        return $templates->map(fn ($t) => [
            'id'          => $t->id,
            'name'        => $t->title,
            'description' => $t->description,
            'price'       => (float) $t->price,
            'purchased'   => in_array($t->id, $purchasedIds) || $t->user_id === $userId,
            'popular'     => false,
            'hasFile'     => !is_null($t->file_path),
            'category'    => $t->category,
        ])->toArray();
    }

    /**
     * Notification feed built from real events: new content, new webinars,
     * new deals, and system updates stored in the notifications table (if it
     * exists). Falls back to synthesised items from recent activity if the
     * notifications table is absent.
     */
    private function buildNotifications(int $userId): array
    {
        $items = collect();
        $dismissed = LearnerNotificationDismissals::dismissedIds($userId);

        // ── 1. Native notifications table (optional) ─────────────────────
        if (\Schema::hasTable('notifications')) {
            $rows = \DB::table('notifications')
                ->where('notifiable_type', 'App\\Models\\User')
                ->where('notifiable_id', $userId)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            foreach ($rows as $row) {
                $payload = json_decode($row->data ?? '{}', true) ?: [];
                $items->push($this->enrichNotificationLink([
                    'id'          => $row->id,
                    'title'       => $payload['title']   ?? 'Notification',
                    'description' => $payload['message'] ?? ($payload['description'] ?? ''),
                    'time'        => $this->safeHumanTime($row->created_at),
                    'read'        => !is_null($row->read_at),
                    'type'        => $payload['type'] ?? 'system',
                    'link'        => $payload['link'] ?? null,
                    'sort_at'     => $row->created_at,
                ], $userId));
            }
        }

        // ── 2. Merge activity-based notifications (always include recent platform activity)
        $existingIds = $items->pluck('id')->map(fn ($id) => (string) $id)->all();
        foreach ($this->synthesiseNotifications($userId) as $entry) {
            if (!in_array((string) $entry['id'], $existingIds, true)) {
                $items->push($entry);
            }
        }

        return $items
            ->sortByDesc(fn (array $item) => $item['sort_at'] ?? now())
            ->take(10)
            ->values()
            ->map(fn (array $item) => collect($item)->except('sort_at')->all())
            ->all();
    }

    /**
     * Ensure every notification has a navigable link when possible.
     */
    private function enrichNotificationLink(array $item, int $userId): array
    {
        if (!empty($item['link'])) {
            return $item;
        }

        $id = (string) ($item['id'] ?? '');

        if (str_starts_with($id, 'video_')) {
            $contentId = (int) substr($id, 6);
            $content = Content::published()->find($contentId);
            if ($content?->course_id) {
                $item['link'] = "/learn/courses/{$content->course_id}/lessons/{$contentId}";
                $item['type'] = 'course';
            }

            return $item;
        }

        if (str_starts_with($id, 'deal_')) {
            $dealId = (int) substr($id, 5);
            $item['link'] = "/learn?tab=deals&dealId={$dealId}";
            $item['type'] = 'deal';

            return $item;
        }

        if (str_starts_with($id, 'webinar_reg_') || str_starts_with($id, 'webinar_rej_')) {
            $item['link'] = '/learn?tab=webinars';
            $item['type'] = 'webinar';

            return $item;
        }

        $title = (string) ($item['title'] ?? '');

        if (($item['type'] ?? '') === 'course' || str_contains($title, 'New Lesson:')) {
            if (preg_match('/New Lesson: "(.+)"/', $title, $matches) === 1) {
                $content = Content::published()
                    ->where('type', 'video')
                    ->where('title', $matches[1])
                    ->whereIn('course_id', CourseEnrollment::where('user_id', $userId)->pluck('course_id'))
                    ->first();

                if ($content?->course_id) {
                    $item['link'] = "/learn/courses/{$content->course_id}/lessons/{$content->id}";
                    $item['type'] = 'course';
                }
            }
        }

        if (($item['type'] ?? '') === 'deal' || str_starts_with($title, 'Hot Deal Alert:')) {
            $dealTitle = str_starts_with($title, 'Hot Deal Alert:')
                ? trim(substr($title, strlen('Hot Deal Alert:')))
                : null;

            $deal = $dealTitle
                ? Deal::where('title', $dealTitle)->first()
                : null;

            if ($deal) {
                $item['link'] = "/learn?tab=deals&dealId={$deal->id}";
                $item['type'] = 'deal';
            }
        }

        if (($item['type'] ?? '') === 'webinar' && empty($item['link'])) {
            $item['link'] = '/learn?tab=webinars';
        }

        return $item;
    }

    /**
     * Build synthetic notification items from recent platform activity
     * (new video content, upcoming webinars, new deals, new templates).
     */
    private function synthesiseNotifications(int $userId): \Illuminate\Support\Collection
    {
        $items = collect();
        $dismissed = LearnerNotificationDismissals::dismissedIds($userId);

        // New video content in enrolled courses
        $enrolledCourseIds = CourseEnrollment::where('user_id', $userId)->pluck('course_id');
        $newVideos = Content::published()
            ->where('type', 'video')
            ->whereIn('course_id', $enrolledCourseIds)
            ->where('published_at', '>=', now()->subDays(14))
            ->orderByDesc('published_at')
            ->limit(3)
            ->get();

        foreach ($newVideos as $v) {
            $id = 'video_' . $v->id;
            $items->push([
                'id'          => $id,
                'title'       => 'New Lesson: "' . $v->title . '"',
                'description' => 'A new video lesson has been published in your enrolled course.',
                'time'        => $this->safeHumanTime($v->published_at),
                'sort_at'     => $v->published_at,
                'read'        => in_array($id, $dismissed, true),
                'type'        => 'course',
                'link'        => "/learn/courses/{$v->course_id}/lessons/{$v->id}",
            ]);
        }

        // Upcoming webinar registrations awaiting approval
        $pendingWebinars = WebinarRegistration::where('learner_id', $userId)
            ->where('status', 'registered')
            ->with('webinar:id,title,date')
            ->orderByDesc('created_at')
            ->limit(2)
            ->get();

        foreach ($pendingWebinars as $reg) {
            if (!$reg->webinar) continue;
            $id = 'webinar_reg_' . $reg->id;
            $items->push([
                'id'          => $id,
                'title'       => 'Webinar Registration Open: "' . $reg->webinar->title . '"',
                'description' => 'Your registration is pending instructor approval.',
                'time'        => $this->safeHumanTime($reg->created_at),
                'sort_at'     => $reg->created_at,
                'read'        => in_array($id, $dismissed, true),
                'type'        => 'webinar',
                'link'        => '/learn?tab=webinars',
            ]);
        }

        // Rejected webinar registrations (with refund info when applicable)
        $rejectedWebinars = WebinarRegistration::where('learner_id', $userId)
            ->where('status', 'rejected')
            ->where('rejected_at', '>=', now()->subDays(30))
            ->with('webinar:id,title')
            ->orderByDesc('rejected_at')
            ->limit(3)
            ->get();

        foreach ($rejectedWebinars as $reg) {
            if (!$reg->webinar) {
                continue;
            }

            $id = 'webinar_rej_' . $reg->id;
            $wasPaid = in_array($reg->payment_status, ['paid', 'refunded'], true)
                && (float) ($reg->amount_paid ?? 0) > 0;

            $description = 'Your registration was not approved.';
            if ($reg->payment_status === 'refunded' && $wasPaid) {
                $amount = '£' . number_format((float) $reg->amount_paid, 2);
                $description = "Your registration was not approved. A refund of {$amount} has been initiated to your original payment method. Refunds typically appear within 5–10 business days.";
            } elseif ($wasPaid) {
                $description = 'Your registration was not approved. Please contact support if you need help with your payment.';
            }

            if ($reg->rejection_reason) {
                $description .= ' Reason: ' . $reg->rejection_reason;
            }

            $items->push([
                'id'          => $id,
                'title'       => 'Registration Declined: "' . $reg->webinar->title . '"',
                'description' => $description,
                'time'        => $this->safeHumanTime($reg->rejected_at ?? $reg->updated_at),
                'sort_at'     => $reg->rejected_at ?? $reg->updated_at,
                'read'        => in_array($id, $dismissed, true),
                'type'        => 'webinar',
                'link'        => '/learn?tab=webinars',
            ]);
        }

        // New deals published in the last 7 days
        $newDeals = Deal::published()
            ->where('published_at', '>=', now()->subDays(7))
            ->orderByDesc('published_at')
            ->limit(2)
            ->get();

        foreach ($newDeals as $deal) {
            $id = 'deal_' . $deal->id;
            $items->push([
                'id'          => $id,
                'title'       => 'Hot Deal Alert: ' . $deal->title,
                'description' => 'A new investment deal has been published with strong ROI potential.',
                'time'        => $this->safeHumanTime($deal->published_at),
                'sort_at'     => $deal->published_at,
                'read'        => in_array($id, $dismissed, true),
                'type'        => 'deal',
                'link'        => "/learn?tab=deals&dealId={$deal->id}",
            ]);
        }

        // New contract templates in the last 14 days
        $newTemplates = ContractTemplate::where('is_active', true)
            ->where('is_global', true)
            ->where('created_at', '>=', now()->subDays(14))
            ->orderByDesc('created_at')
            ->limit(2)
            ->get();

        foreach ($newTemplates as $t) {
            $id = 'template_' . $t->id;
            $items->push([
                'id'          => $id,
                'title'       => 'New Contract Template: ' . $t->title,
                'description' => 'A new legal template has been added to the platform.',
                'time'        => $this->safeHumanTime($t->created_at),
                'sort_at'     => $t->created_at,
                'read'        => in_array($id, $dismissed, true),
                'type'        => 'system',
                'link'        => '/learn?tab=learn',
            ]);
        }

        return $items
            ->sortByDesc('sort_at')
            ->map(fn (array $item) => collect($item)->except('sort_at')->all())
            ->values();
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Calculate how much the learner's overall progress changed this month.
     */
    private function progressTrend(int $userId): string
    {
        $thisMonth = LessonProgress::where('user_id', $userId)
            ->where('is_completed', true)
            ->where('completed_at', '>=', now()->startOfMonth())
            ->count();

        return $thisMonth > 0 ? "+{$thisMonth} this month" : 'Keep going!';
    }

    private function countUpcomingPlatformMeetings(?\App\Models\User $user): int
    {
        if (!$user || !$this->platformMeetingsAvailable()) {
            return 0;
        }

        try {
            return $this->platformMeetingsQuery($user)
                ->where('start_time', '>=', now())
                ->count();
        } catch (\Throwable $exception) {
            Log::warning('Learner dashboard could not count platform meetings', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            return 0;
        }
    }

    /**
     * @return list<array{id:int,title:string,date:string,time:string,type:string,status:string}>
     */
    private function buildUpcomingPlatformMeetings(?\App\Models\User $user): array
    {
        if (!$user || !$this->platformMeetingsAvailable()) {
            return [];
        }

        try {
            return $this->platformMeetingsQuery($user)
                ->where('start_time', '>=', now())
                ->where('start_time', '<=', now()->addDays(7))
                ->orderBy('start_time')
                ->limit(5)
                ->get()
                ->map(function (PlatformMeeting $meeting) {
                    if (!$meeting->start_time) {
                        return null;
                    }

                    $timezone = $meeting->resolvedTimezone();
                    $start = $meeting->start_time->timezone($timezone);

                    return [
                        'id'     => $meeting->id,
                        'title'  => $meeting->meeting_type === 'discovery_call'
                            ? 'Discovery Call with Admin'
                            : 'Platform Meeting',
                        'date'   => $start->toDateString(),
                        'time'   => $start->format('H:i'),
                        'type'   => $meeting->meeting_type ?? 'meeting',
                        'status' => $meeting->public_status,
                    ];
                })
                ->filter()
                ->values()
                ->all();
        } catch (\Throwable $exception) {
            Log::warning('Learner dashboard could not load platform meetings', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            return [];
        }
    }

    private function platformMeetingsAvailable(): bool
    {
        return Schema::hasTable('platform_meetings');
    }

    private function platformMeetingsQuery(?\App\Models\User $user)
    {
        if (!$user) {
            return PlatformMeeting::query()->whereRaw('1 = 0');
        }

        $normalizedEmail = strtolower(trim((string) $user->email));

        return PlatformMeeting::query()
            ->whereIn('status', ['scheduled', 'rescheduled', 'booked'])
            ->where(function ($query) use ($user, $normalizedEmail) {
                $query->where('user_id', $user->id);

                if ($normalizedEmail !== '') {
                    $query->orWhereRaw('LOWER(email) = ?', [$normalizedEmail]);

                    if (Schema::hasColumn('platform_meetings', 'participants')) {
                        PlatformMeetingParticipantScope::applyParticipantEmailConstraint($query, $normalizedEmail);
                    }
                }
            });
    }

    /**
     * @template T
     * @param  callable(): T  $builder
     * @return T
     */
    private function safeSection(string $section, callable $builder, mixed $default): mixed
    {
        try {
            return $builder();
        } catch (\Throwable $exception) {
            Log::warning("Learner dashboard section failed: {$section}", [
                'message' => $exception->getMessage(),
            ]);

            return $default;
        }
    }

    private function emptyStats(): array
    {
        return [
            'courseProgress' => [
                'value' => '0%',
                'raw'   => 0,
                'trend' => 'Keep going!',
                'label' => 'Course Progress',
            ],
            'meetingsBooked' => [
                'value' => '0',
                'raw'   => 0,
                'trend' => 'No meetings booked',
                'label' => 'Meetings Booked',
            ],
            'savedDeals' => [
                'value' => '0',
                'raw'   => 0,
                'trend' => 'Active',
                'label' => 'Saved Deals',
            ],
            'notifications' => [
                'value'  => '0',
                'raw'    => 0,
                'unread' => 0,
                'trend'  => 'Unread: 0',
                'label'  => 'New Updates',
            ],
        ];
    }

    private function emptyQuickStats(): array
    {
        return [
            'latestVideoLessons' => 0,
            'upcomingWebinars'   => 0,
            'newDeals'           => 0,
            'contractTemplates'  => 0,
        ];
    }

    private function emptyDashboardPayload(): array
    {
        return [
            'stats'             => $this->emptyStats(),
            'videoLessons'      => [],
            'upcomingMeetings'  => [],
            'upcomingWebinars'  => [],
            'recentDeals'       => [],
            'contractTemplates' => [],
            'notifications'     => [],
            'quickStats'        => $this->emptyQuickStats(),
        ];
    }

    private function safeHumanTime(mixed $timestamp): string
    {
        try {
            return HumanTime::ago($timestamp);
        } catch (\Throwable) {
            return 'recently';
        }
    }
}