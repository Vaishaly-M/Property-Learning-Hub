<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FreesbyTemplateDownload extends Model
{
    use HasFactory;

    // Specify the table name
    protected $table = 'freesby_template_downloads';

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'template_name',
        'template_slug',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}