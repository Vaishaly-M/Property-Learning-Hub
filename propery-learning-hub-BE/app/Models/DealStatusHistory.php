<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DealStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'deal_status_histories';

    protected $fillable = [
        'deal_id',
        'old_status',
        'new_status',
        'note',
        'changed_by'
    ];

    public $timestamps = false;

    protected $casts = [
        'created_at' => 'datetime'
    ];

    public function deal()
    {
        return $this->belongsTo(Deal::class, 'deal_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
