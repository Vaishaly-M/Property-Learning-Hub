<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmWorkflowRule extends Model
{
    protected $fillable = [
        'name',
        'trigger_event',
        'conditions',
        'actions',
        'is_active',
        'priority',
    ];

    protected $casts = [
        'conditions' => 'array',
        'actions'    => 'array',
        'is_active'  => 'boolean',
    ];
}
