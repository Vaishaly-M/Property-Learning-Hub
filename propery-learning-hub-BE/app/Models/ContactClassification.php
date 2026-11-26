<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactClassification extends Model
{
    protected $fillable = ['contact_id', 'classification'];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
