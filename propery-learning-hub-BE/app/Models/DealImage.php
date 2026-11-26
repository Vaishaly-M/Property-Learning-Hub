<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DealImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'deal_id',
        'image_url',
        'order',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'order' => 'integer',
    ];

    protected $appends = ['image_url_full'];

    public function deal()
    {
        return $this->belongsTo(Deal::class);
    }

    public function getImageUrlFullAttribute()
    {
        return $this->image_url ? MediaUrl::url($this->image_url) : null;
    }
}