<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Support\HumanTime;
use App\Support\LearnerNotificationDismissals;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Handles the in-app notification / updates feed for learners.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!Schema::hasTable('notifications')) {
            return $this->emptyPaginated();
        }

        $userId = Auth::id();
        $perPage = $request->get('per_page', 15);

        $query = DB::table('notifications')
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $userId)
            ->orderByDesc('created_at');

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        $paginated = $query->paginate($perPage);
        $items = collect($paginated->items())->map(fn ($row) => $this->transform($row));

        return response()->json([
            'success' => true,
            'data'    => $items,
            'meta'    => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
                'unread_count' => $this->unreadCount($userId),
            ],
        ]);
    }

    public function unreadCountEndpoint(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => ['count' => $this->unreadCount(Auth::id())],
        ]);
    }

    public function markRead(string $id): JsonResponse
    {
        $userId = Auth::id();

        if (LearnerNotificationDismissals::isSyntheticId($id)) {
            LearnerNotificationDismissals::dismiss($userId, [$id]);
            return response()->json(['success' => true, 'message' => 'Marked as read']);
        }

        if (Schema::hasTable('notifications')) {
            DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_type', 'App\\Models\\User')
                ->where('notifiable_id', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);

            LearnerNotificationDismissals::clearDashboardCache($userId);
        }

        return response()->json(['success' => true, 'message' => 'Marked as read']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $userId = Auth::id();

        if (Schema::hasTable('notifications')) {
            DB::table('notifications')
                ->where('notifiable_type', 'App\\Models\\User')
                ->where('notifiable_id', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        $syntheticIds = $request->input('synthetic_ids', []);
        if (is_array($syntheticIds) && $syntheticIds !== []) {
            LearnerNotificationDismissals::dismiss($userId, $syntheticIds);
        } else {
            LearnerNotificationDismissals::clearDashboardCache($userId);
        }

        return response()->json(['success' => true, 'message' => 'All notifications marked as read']);
    }

    public function destroy(string $id): JsonResponse
    {
        $userId = Auth::id();

        if (LearnerNotificationDismissals::isSyntheticId($id)) {
            LearnerNotificationDismissals::dismiss($userId, [$id]);
            return response()->json(['success' => true, 'message' => 'Notification deleted']);
        }

        if (Schema::hasTable('notifications')) {
            DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_type', 'App\\Models\\User')
                ->where('notifiable_id', $userId)
                ->delete();

            LearnerNotificationDismissals::clearDashboardCache($userId);
        }

        return response()->json(['success' => true, 'message' => 'Notification deleted']);
    }

    private function transform(object $row): array
    {
        $payload = json_decode($row->data ?? '{}', true) ?? [];

        return [
            'id'          => $row->id,
            'title'       => $payload['title']   ?? 'Notification',
            'description' => $payload['message'] ?? ($payload['description'] ?? ''),
            'time'        => HumanTime::ago($row->created_at),
            'read'        => !is_null($row->read_at),
            'type'        => $payload['type'] ?? 'system',
            'link'        => $payload['link']  ?? null,
            'createdAt'   => $row->created_at,
        ];
    }

    private function unreadCount(int $userId): int
    {
        if (!Schema::hasTable('notifications')) {
            return 0;
        }

        return DB::table('notifications')
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $userId)
            ->whereNull('read_at')
            ->count();
    }

    private function emptyPaginated(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [],
            'meta'    => [
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => 15,
                'total'        => 0,
                'unread_count' => 0,
            ],
        ]);
    }
}
