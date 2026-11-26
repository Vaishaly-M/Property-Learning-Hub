<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AvailabilitySetting extends Model
{
    protected $fillable = [
        'working_hours_start',
        'working_hours_end',
        'lunch_break_start',
        'lunch_break_end',
        'slot_duration',
        'timezone',
    ];

    protected function casts(): array
    {
        return [
            'slot_duration' => 'integer',
        ];
    }
}
