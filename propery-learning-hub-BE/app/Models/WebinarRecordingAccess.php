<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebinarRecordingAccess extends Model
{
    protected $table = 'webinar_recording_accesses';

    protected $fillable = [
        'webinar_id',
        'learner_id',
        'status',
        'request_message',
        'rejection_reason',
        'approved_at',
        'rejected_at',
        'expires_at',
        'download_count',
        'last_accessed_at',
    ];

    protected $casts = [
        'approved_at'      => 'datetime',
        'rejected_at'      => 'datetime',
        'expires_at'       => 'datetime',
        'last_accessed_at' => 'datetime',
    ];

    public function webinar()
    {
        return $this->belongsTo(Webinar::class);
    }

    public function learner()
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    public function isActive(): bool
    {
        if ($this->status !== 'approved') {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}