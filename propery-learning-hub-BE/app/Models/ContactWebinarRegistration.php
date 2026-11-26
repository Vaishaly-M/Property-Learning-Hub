<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactWebinarRegistration extends Model
{
    protected $fillable = [
        'webinar_id',
        'contact_id',
        'attended',
        'no_show',
        'status',
        'registered_at',
        'confirmation_sent_at',
        'reminder_sent_at',
        'follow_up_sent_at',
    ];

    protected $casts = [
        'attended'             => 'boolean',
        'no_show'              => 'boolean',
        'registered_at'        => 'datetime',
        'confirmation_sent_at' => 'datetime',
        'reminder_sent_at'     => 'datetime',
        'follow_up_sent_at'    => 'datetime',
    ];

    public function webinar(): BelongsTo
    {
        return $this->belongsTo(Webinar::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
