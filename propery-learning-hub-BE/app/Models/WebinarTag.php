<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebinarTag extends Model
{
    protected $fillable = ['webinar_id', 'tag'];

    public function webinar()
    {
        return $this->belongsTo(Webinar::class);
    }
}