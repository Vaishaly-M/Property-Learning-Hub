<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipHistory extends Model
{
    protected $fillable = [
        'membership_id',
        'contact_id',
        'action',
        'snapshot',
        'performed_by',
    ];

    protected $casts = [
        'snapshot' => 'array',
    ];

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
