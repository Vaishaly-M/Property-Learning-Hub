<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmEventRegistration extends Model
{
    protected $fillable = [
        'crm_event_id',
        'contact_id',
        'attended',
        'no_show',
        'registered_at',
    ];

    protected $casts = [
        'attended'      => 'boolean',
        'no_show'       => 'boolean',
        'registered_at' => 'datetime',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(CrmEvent::class, 'crm_event_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
