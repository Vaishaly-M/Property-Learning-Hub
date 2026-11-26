<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PastWebinarRecording extends Model
{
    use HasFactory;

    protected $fillable = [
        'instructor_id',
        'title',
        'description',
        'video_path',
        'thumbnail_path',
        'recorded_at',
        'duration',
        'views',
    ];

    protected $casts = [
        'recorded_at' => 'date',
        'duration' => 'integer',
        'views' => 'integer',
    ];

    public function instructor()
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }
}