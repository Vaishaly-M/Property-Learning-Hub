<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingRegistration extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'learner_id',
        'status',
        'registration_notes',
        'rejection_reason',
        'registered_at',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'registered_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    // Relationships
    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function learner()
    {
        return $this->belongsTo(User::class, 'learner_id');
    }
}