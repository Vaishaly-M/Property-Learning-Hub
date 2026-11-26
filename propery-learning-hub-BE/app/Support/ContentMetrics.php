<?php

namespace App\Support;

use App\Models\Content;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ContentMetrics
{
    /**
     * Base query for dashboard / library counts.
     * Only includes content assigned to an existing course so totals
     * match what admins see in Course Management.
     */
    public static function query(?User $user = null): Builder
    {
        $query = Content::query()
            ->whereNotNull('course_id')
            ->whereHas('course');

        $user ??= auth()->user();

        if ($user && !$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('course', function ($courseQuery) use ($user) {
                        $courseQuery->where('user_id', $user->id);
                    });
            });
        }

        return $query;
    }

  /**
     * Filters used by the content list UI (includes type tab filter).
     */
    public static function applyListFilters(Builder $query, Request $request): Builder
    {
        return static::applySharedFilters($query, $request, includeType: true);
    }

    /**
     * Filters for aggregate counts (videos/documents) — never filter by active tab type
     * so course and platform totals stay consistent across views.
     */
    public static function applyCountFilters(Builder $query, Request $request): Builder
    {
        return static::applySharedFilters($query, $request, includeType: false);
    }

    private static function applySharedFilters(
        Builder $query,
        Request $request,
        bool $includeType
    ): Builder {
        if ($includeType && $request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('module_id')) {
            $query->where('module_id', $request->module_id);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category_id', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    /**
     * @return array{videos: int, documents: int, total: int, published: int}
     */
    public static function counts(?User $user = null, ?Request $request = null): array
    {
        $query = static::query($user);

        if ($request) {
            $query = static::applyCountFilters($query, $request);
        }

        $videos = (clone $query)->where('type', 'video')->count();
        $documents = (clone $query)->where('type', 'document')->count();

        return [
            'videos'    => $videos,
            'documents' => $documents,
            'total'     => $videos + $documents,
            'published' => (clone $query)->where('is_published', true)->count(),
        ];
    }
}
