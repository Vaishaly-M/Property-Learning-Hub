<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebinarLearningObjective extends Model
{
    protected $fillable = ['webinar_id', 'objective', 'sort_order'];

    public function webinar()
    {
        return $this->belongsTo(Webinar::class);
    }
}