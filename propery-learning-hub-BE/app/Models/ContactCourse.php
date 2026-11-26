<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactCourse extends Model
{
    protected $fillable = [
        'contact_id',
        'course_id',
        'purchase_date',
        'completion_status',
        'certificate_issued',
        'certificate_issued_at',
        'amount_paid',
    ];

    protected $casts = [
        'purchase_date'         => 'date',
        'certificate_issued'    => 'boolean',
        'certificate_issued_at' => 'datetime',
        'amount_paid'           => 'decimal:2',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
