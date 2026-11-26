<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupportInquiry extends Model
{
    use HasFactory;

    protected $table = 'support_inquiries';

    protected $fillable = [
        'name',
        'email',
        'category',
        'message',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
