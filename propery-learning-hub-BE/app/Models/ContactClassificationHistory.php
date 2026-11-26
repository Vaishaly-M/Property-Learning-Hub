<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactClassificationHistory extends Model
{
    protected $fillable = [
        'contact_id',
        'previous_classification',
        'new_classification',
        'changed_by',
        'change_date',
    ];

    protected $casts = [
        'change_date' => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
