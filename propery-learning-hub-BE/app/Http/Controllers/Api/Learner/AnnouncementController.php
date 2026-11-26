<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Support\HumanTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! Schema::hasTable('notifications')) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $userId = Auth::id();
        $perPage = (int) $request->get('per_page', 20);

        $paginated = DB::table('notifications')
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $userId)
            ->where('type', 'learner_announcement')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $items = collect($paginated->items())->map(function ($row) {
            return $this->formatAnnouncement($row);
        })->values();

        return response()->json([
            'success' => true,
            'data'    => $items,
            'meta'    => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    public function markRead(string $id): JsonResponse
    {
        if (! Schema::hasTable('notifications')) {
            return response()->json(['success' => false, 'message' => 'Notifications unavailable'], 503);
        }

        $updated = DB::table('notifications')
            ->where('id', $id)
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->where('type', 'learner_announcement')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        if ($updated === 0) {
            $exists = DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_type', 'App\\Models\\User')
                ->where('notifiable_id', Auth::id())
                ->where('type', 'learner_announcement')
                ->exists();

            if (! $exists) {
                return response()->json(['success' => false, 'message' => 'Announcement not found'], 404);
            }
        }

        return response()->json(['success' => true, 'message' => 'Marked as read']);
    }

    public function toggleBookmark(string $id): JsonResponse
    {
        if (! Schema::hasTable('notifications')) {
            return response()->json(['success' => false, 'message' => 'Notifications unavailable'], 503);
        }

        $row = DB::table('notifications')
            ->where('id', $id)
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->where('type', 'learner_announcement')
            ->first();

        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Announcement not found'], 404);
        }

        $payload = json_decode($row->data ?? '{}', true) ?? [];
        $payload['is_bookmarked'] = ! (bool) ($payload['is_bookmarked'] ?? false);

        DB::table('notifications')
            ->where('id', $id)
            ->update([
                'data'       => json_encode($payload),
                'updated_at' => now(),
            ]);

        return response()->json([
            'success'      => true,
            'isBookmarked' => $payload['is_bookmarked'],
            'message'      => $payload['is_bookmarked'] ? 'Announcement bookmarked' : 'Bookmark removed',
        ]);
    }

    public function togglePin(string $id): JsonResponse
    {
        if (! Schema::hasTable('notifications')) {
            return response()->json(['success' => false, 'message' => 'Notifications unavailable'], 503);
        }

        $row = DB::table('notifications')
            ->where('id', $id)
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->where('type', 'learner_announcement')
            ->first();

        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Announcement not found'], 404);
        }

        $payload = json_decode($row->data ?? '{}', true) ?? [];
        $payload['is_pinned'] = ! (bool) ($payload['is_pinned'] ?? false);

        DB::table('notifications')
            ->where('id', $id)
            ->update([
                'data'       => json_encode($payload),
                'updated_at' => now(),
            ]);

        return response()->json([
            'success'  => true,
            'isPinned' => $payload['is_pinned'],
            'message'  => $payload['is_pinned'] ? 'Announcement pinned' : 'Announcement unpinned',
        ]);
    }

    private function formatAnnouncement(object $row): array
    {
        $payload = json_decode($row->data ?? '{}', true) ?? [];

        return [
            'id'           => (string) $row->id,
            'title'        => $payload['title'] ?? 'Announcement',
            'content'      => $payload['message'] ?? ($payload['description'] ?? ''),
            'date'         => date('Y-m-d', strtotime((string) $row->created_at)),
            'time'         => date('g:i A', strtotime((string) $row->created_at)),
            'priority'     => $payload['priority'] ?? 'medium',
            'category'     => $payload['category'] ?? 'general',
            'tags'         => $payload['tags'] ?? [],
            'isRead'       => ! is_null($row->read_at),
            'isBookmarked' => (bool) ($payload['is_bookmarked'] ?? false),
            'isPinned'     => (bool) ($payload['is_pinned'] ?? false),
            'author'       => [
                'name'   => $payload['author_name'] ?? 'Freedom Property Academy',
                'role'   => $payload['author_role'] ?? 'Admin',
                'avatar' => $payload['author_avatar'] ?? 'FP',
            ],
            'createdAt'    => $row->created_at,
            'timeAgo'      => HumanTime::ago($row->created_at),
        ];
    }
}
