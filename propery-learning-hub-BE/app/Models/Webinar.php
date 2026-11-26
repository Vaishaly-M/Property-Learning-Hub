<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Support\MediaStorage;
use App\Support\MediaUrl;

class Webinar extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'instructor_id',
        'title',
        'description',
        'date',
        'time',
        'duration',
        'category',
        'level',
        'price',
        'max_attendees',
        'status',
       
        'live_link',
        'replay_link',
        'thumbnail',
        'recording_path',
        'recording_original_name',
        'recording_size',
        'recording_mime_type',
        'materials_url',
        'avg_watch_time',
        'engagement_rate',
        'satisfaction_score',
        'peak_attendees',
        'started_at',
        'ended_at',
        'participant_type',

        // Zoom Webinar integration
        'zoom_webinar_id',
        'zoom_join_url',
        'zoom_start_url',
        'zoom_uuid',
        'zoom_password',
        'zoom_registration_url',
    ];

    protected $casts = [
        'date'             => 'date:Y-m-d',
        'price'            => 'decimal:2',
        'started_at'       => 'datetime',
        'ended_at'         => 'datetime',
        'avg_watch_time'   => 'decimal:2',
        'engagement_rate'  => 'decimal:2',
        'satisfaction_score' => 'decimal:2',
    ];

    protected $appends = ['recording_url', 'thumbnail_url'];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function instructor()
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function learningObjectives()
    {
        return $this->hasMany(WebinarLearningObjective::class)->orderBy('sort_order');
    }

    public function tags()
    {
        return $this->hasMany(WebinarTag::class);
    }

    public function registrations()
    {
        return $this->hasMany(WebinarRegistration::class);
    }

    public function approvedRegistrations()
    {
        return $this->hasMany(WebinarRegistration::class)->where('status', 'approved');
    }

    public function recordingAccessRequests()
    {
        return $this->hasMany(WebinarRecordingAccess::class);
    }

    // -----------------------------------------------------------------------
    // Accessors
    // -----------------------------------------------------------------------

    public function getRecordingUrlAttribute(): ?string
    {
        if (!$this->recording_path) {
            return null;
        }

        try {
            return MediaUrl::videoPlaybackUrl($this->recording_path);
        } catch (\Throwable) {
            return null;
        }
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail
            ? MediaUrl::url($this->thumbnail)
            : null;
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeByInstructor($query, int $instructorId)
    {
        return $query->where('instructor_id', $instructorId);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('status', 'upcoming');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Webinars learners are allowed to browse/register for.
     * "my_learners" and "all_learners" are both visible to authenticated learners.
     */
    public function scopeVisibleToLearners($query, ?int $learnerId = null)
    {
        return $query->where(function ($q) {
            $q->whereIn('participant_type', ['all_learners', 'my_learners', 'all_others'])
              ->orWhereNull('participant_type')
              ->orWhere('participant_type', '');
        });
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    public function maxCapacity(): int
    {
        $max = (int) ($this->max_attendees ?? 0);

        return $max > 0 ? $max : 100;
    }

    public function approvedRegistrationCount(): int
    {
        return $this->registrations()->where('status', 'approved')->count();
    }

    /**
     * Whether new learners can still register (counts pending + approved spots).
     */
    public function isFull(): bool
    {
        return $this->registrations()
            ->whereIn('status', ['approved', 'registered', 'waitlisted'])
            ->count() >= $this->maxCapacity();
    }

    /**
     * Whether approving another registration would exceed capacity.
     */
    public function isApprovalCapacityReached(): bool
    {
        return $this->approvedRegistrationCount() >= $this->maxCapacity();
    }

    public function scheduledStartAt(): ?\Carbon\Carbon
    {
        if (!$this->date || !$this->time) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse(
                $this->date->format('Y-m-d') . ' ' . $this->time,
                config('app.timezone')
            );
        } catch (\Throwable) {
            return null;
        }
    }

    public function hasScheduledStartPassed(): bool
    {
        $start = $this->scheduledStartAt();

        return $start ? $start->isPast() : false;
    }

    /**
     * Learners may join a few minutes before the scheduled start.
     */
    public function isWithinLiveJoinWindow(int $minutesBefore = 15): bool
    {
        if ($this->status === 'live' || $this->started_at !== null) {
            return true;
        }

        $start = $this->scheduledStartAt();
        if (!$start) {
            return false;
        }

        return now()->gte($start->copy()->subMinutes($minutesBefore));
    }

    /**
     * Whether an approved learner can open the live meeting link now.
     */
    public function hasLearnerJoinOpened(): bool
    {
        if (!in_array($this->status, ['upcoming', 'live'], true)) {
            return false;
        }

        return $this->status === 'live'
            || $this->started_at !== null
            || $this->isWithinLiveJoinWindow();
    }

    /**
     * Ensure join timestamps are reflected in the attended flag.
     */
    public function reconcileAttendanceRecords(): void
    {
        $this->registrations()
            ->where('status', 'approved')
            ->whereNotNull('joined_at')
            ->where('attended', false)
            ->update(['attended' => true]);
    }

    /**
     * Count approved learners who attended (join API or manual mark).
     */
    public function countApprovedAttendees(bool $reconcile = true): int
    {
        if ($reconcile) {
            $this->reconcileAttendanceRecords();
        }

        return (int) $this->registrations()
            ->where('status', 'approved')
            ->where(function ($query) {
                $query->where('attended', true)
                    ->orWhereNotNull('joined_at');
            })
            ->count();
    }

    /**
     * Keep attendance metrics in sync for analytics and reporting.
     */
    public function syncAttendanceMetrics(): self
    {
        $this->reconcileAttendanceRecords();

        $totalAttended = $this->countApprovedAttendees(false);
        $totalWatchTime = (int) $this->registrations()
            ->where('status', 'approved')
            ->where(function ($query) {
                $query->where('attended', true)
                    ->orWhereNotNull('joined_at');
            })
            ->sum('watch_time');
        $avgWatchTime   = $totalAttended > 0 ? round($totalWatchTime / $totalAttended, 2) : 0;
        $totalEligible  = (int) $this->registrations()
            ->whereIn('status', ['approved', 'registered', 'waitlisted'])
            ->count();
        $attendanceRate = $totalEligible > 0 ? round(($totalAttended / $totalEligible) * 100, 2) : 0;
        $contentRetention = $this->duration > 0 ? round(($avgWatchTime / $this->duration) * 100, 2) : 0;

        $this->update([
            'peak_attendees'     => max($totalAttended, (int) ($this->peak_attendees ?? 0)),
            'avg_watch_time'     => $avgWatchTime,
            'engagement_rate'    => $attendanceRate,
            'satisfaction_score' => $contentRetention,
        ]);

        return $this->fresh(['registrations']);
    }

    public function hasRecording(): bool
    {
        return !empty($this->recording_path);
    }

    public function syncLearningObjectives(array $objectives): void
    {
        $this->learningObjectives()->delete();
        foreach ($objectives as $i => $obj) {
            if (!empty(trim($obj))) {
                $this->learningObjectives()->create([
                    'objective'  => trim($obj),
                    'sort_order' => $i,
                ]);
            }
        }
    }

    public function syncTags(array $tags): void
    {
        $this->tags()->delete();
        foreach ($tags as $tag) {
            if (!empty(trim($tag))) {
                $this->tags()->create(['tag' => trim($tag)]);
            }
        }
    }
}