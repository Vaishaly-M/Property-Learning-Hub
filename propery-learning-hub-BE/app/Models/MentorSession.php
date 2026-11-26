<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MentorSession extends Model
{
    protected $fillable = [
        'mentor_id',
        'student_id',
        'event_id',
        'meeting_id',
        'join_url',
        'subject',
        'description',
        'start_time',
        'end_time',
        'status',
        'timezone',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
        ];
    }

    public function mentor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mentor_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['scheduled', 'rescheduled'], true);
    }

    public function overlaps(\DateTimeInterface $start, \DateTimeInterface $end, ?int $excludeId = null): bool
    {
        $query = static::query()
            ->where('mentor_id', $this->mentor_id)
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
