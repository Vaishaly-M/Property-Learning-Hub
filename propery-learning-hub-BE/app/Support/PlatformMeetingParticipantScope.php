<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

class PlatformMeetingParticipantScope
{
    public static function applyParticipantEmailConstraint(Builder $query, string $email): void
    {
        $normalized = strtolower(trim($email));

        if ($normalized === '') {
            return;
        }

        $driver = $query->getConnection()->getDriverName();

        match ($driver) {
            'sqlite' => $query->orWhereRaw(
                "EXISTS (SELECT 1 FROM json_each(COALESCE(participants, '[]')) WHERE lower(json_extract(value, '\$.email')) = ?)",
                [$normalized],
            ),
            'pgsql' => $query->orWhereRaw(
                "EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(participants::jsonb, '[]'::jsonb)) elem WHERE lower(elem->>'email') = ?)",
                [$normalized],
            ),
            default => $query->orWhere(function (Builder $nested) use ($normalized) {
                // Participant emails are stored lowercase in JSON — LIKE is reliable on MySQL/MariaDB.
                $escaped = addcslashes($normalized, '%_\\');
                $nested->whereNotNull('participants')
                    ->where(function (Builder $jsonMatch) use ($escaped) {
                        $jsonMatch->where('participants', 'like', '%"email":"' . $escaped . '"%')
                            ->orWhere('participants', 'like', '%"email": "' . $escaped . '"%');
                    });
            }),
        };
    }
}
