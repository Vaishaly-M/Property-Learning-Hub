<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Meeting extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'instructor_id',
        'title',
        'description',
        'type',
        'date',
        'time',
        'duration',
        'status',
        'meeting_link',
        'zoom_meeting_id',
        'zoom_password',
        'waiting_room',
        'allow_recording',
        'recording_url',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'date' => 'date',
        'time' => 'datetime:H:i',
        'waiting_room' => 'boolean',
        'allow_recording' => 'boolean',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    // Relationships
    public function instructor()
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function participants()
    {
        return $this->hasMany(MeetingParticipant::class);
    }

    public function registrations()
    {
        return $this->hasMany(MeetingRegistration::class);
    }

    // Helper methods
    public function isFull(): bool
    {
        $confirmedCount = $this->participants()
            ->whereIn('status', ['confirmed', 'attended'])
            ->count();
        
        // No hard limit for now, but can be configured
        return false;
    }

    public function canJoin(User $user): bool
    {
        $participant = $this->participants()
            ->where('user_id', $user->id)
            ->whereIn('status', ['confirmed', 'attended'])
            ->first();
        
        return $participant !== null;
    }

    public function getConfirmedParticipantsCount(): int
    {
        return $this->participants()
            ->whereIn('status', ['confirmed', 'attended'])
            ->count();
    }

    public function scopeByInstructor($query, $instructorId)
    {
        return $query->where('instructor_id', $instructorId);
    }

    public function scopeForLearner($query, $learnerId)
    {
        return $query->whereHas('participants', function ($q) use ($learnerId) {
            $q->where('user_id', $learnerId)
              ->whereIn('status', ['confirmed', 'attended']);
        });
    }

    public function scopeInvited($query, $userId)
    {
        return $query->whereHas('participants', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }

    public function scopeUpcoming($query)
    {
        // Include scheduled meetings that have not ended yet (today remaining + future dates).
        return $query->where('status', 'scheduled')
            ->where(function ($q) {
                $q->whereDate('date', '>', now()->toDateString())
                  ->orWhere(function ($sub) {
                      $sub->whereDate('date', '=', now()->toDateString())
                          ->whereTime('time', '>=', now()->toTimeString());
                  });
            });
    }

    public function scopeLiveNow($query)
    {
        return $query->where(function ($q) {
            $q->where('status', 'in-progress')
              ->orWhere(function ($live) {
                  $live->where('status', 'scheduled')
                      ->whereDate('date', '=', now()->toDateString())
                      ->whereTime('time', '<=', now()->toTimeString());
              });
        });
    }
}