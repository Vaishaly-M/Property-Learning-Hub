<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebinarRegistration extends Model
{
    protected $fillable = [
        'webinar_id',
        'learner_id',
        'status',
        'attended',
        'manual_attendance',
        'watch_time',
        'payment_status',
        'payment_reference',
        'amount_paid',
        'approved_at',
        'rejected_at',
        'rejection_reason',
        'joined_at',
        'left_at',
    ];

    protected $casts = [
        'attended'           => 'boolean',
        'manual_attendance'  => 'boolean',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'joined_at'   => 'datetime',
        'left_at'     => 'datetime',
        'amount_paid' => 'decimal:2',
    ];

    public function webinar()
    {
        return $this->belongsTo(Webinar::class);
    }

    public function learner()
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }
}