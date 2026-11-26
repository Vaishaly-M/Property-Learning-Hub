<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class LearnerNotificationDismissals
{
    public static function cacheKey(int $userId): string
    {
        return "learner_dismissed_notifications_{$userId}";
    }

    public static function isSyntheticId(string $id): bool
    {
        return (bool) preg_match('/^(video|deal|webinar_reg|webinar_rej|template)_/', $id);
    }

    /**
     * @return list<string>
     */
    public static function dismissedIds(int $userId): array
    {
        $stored = Cache::get(self::cacheKey($userId), []);

        return is_array($stored)
            ? array_values(array_unique(array_map('strval', $stored)))
            : [];
    }

    public static function isDismissed(int $userId, string $id): bool
    {
        return in_array($id, self::dismissedIds($userId), true);
    }

    /**
     * @param  list<string>  $ids
     */
    public static function dismiss(int $userId, array $ids): void
    {
        $normalized = array_values(array_unique(array_filter(array_map(
            fn ($id) => trim((string) $id),
            $ids
        ))));

        if ($normalized === []) {
            return;
        }

        $merged = array_values(array_unique(array_merge(self::dismissedIds($userId), $normalized)));
        Cache::forever(self::cacheKey($userId), $merged);
        Cache::forget("learner_dashboard_v2_{$userId}");
    }

    public static function clearDashboardCache(int $userId): void
    {
        Cache::forget("learner_dashboard_v2_{$userId}");
    }
}
