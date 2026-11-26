<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Membership extends Model
{
    protected $fillable = [
        'contact_id',
        'type',
        'status',
        'start_date',
        'renewal_date',
        'expiry_date',
        'payment_status',
        'amount',
        'notes',
    ];

    protected $casts = [
        'start_date'   => 'date',
        'renewal_date' => 'date',
        'expiry_date'  => 'date',
        'amount'       => 'decimal:2',
    ];

    public function histories()
    {
        return $this->hasMany(MembershipHistory::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
