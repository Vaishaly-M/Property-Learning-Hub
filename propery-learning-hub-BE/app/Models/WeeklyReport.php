<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class WeeklyReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'week_start',
        'week_end',
        'week_number',
        'year',
        'courses_enrolled_current',
        'courses_completed_current',
        'lessons_completed_current',
        'watch_time_seconds_current',
        'meetings_attended_current',
        'webinars_attended_current',
        'courses_enrolled_previous',
        'courses_completed_previous',
        'lessons_completed_previous',
        'watch_time_seconds_previous',
        'meetings_attended_previous',
        'webinars_attended_previous',
        'comparison_data',
        'status_message',
        'next_week_goals',
    ];

    protected $casts = [
        'week_start' => 'date',
        'week_end' => 'date',
        'comparison_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Helper to get formatted watch time
    public function getWatchTimeCurrentFormattedAttribute()
    {
        return $this->formatWatchTime($this->watch_time_seconds_current);
    }

    public function getWatchTimePreviousFormattedAttribute()
    {
        return $this->formatWatchTime($this->watch_time_seconds_previous);
    }

    private function formatWatchTime($seconds)
    {
        if ($seconds < 60) {
            return $seconds . 's';
        }
        
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        
        if ($hours > 0) {
            return $hours . 'h ' . $minutes . 'm';
        }
        
        return $minutes . 'm';
    }

    // Get comparison percentage change
    public function getComparisonChange($metric)
    {
        $current = $this->{$metric . '_current'};
        $previous = $this->{$metric . '_previous'};
        
        if ($previous == 0) {
            return $current > 0 ? '+100%' : '0%';
        }
        
        $change = (($current - $previous) / $previous) * 100;
        return ($change > 0 ? '+' : '') . round($change) . '%';
    }

    // Get trend (up, down, same)
    public function getTrend($metric)
    {
        $current = $this->{$metric . '_current'};
        $previous = $this->{$metric . '_previous'};
        
        if ($current > $previous) return 'up';
        if ($current < $previous) return 'down';
        return 'same';
    }
}