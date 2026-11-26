<?php
// app/Http/Resources/WeeklyReportResource.php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WeeklyReportResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'week_start' => $this->week_start->toDateString(),
            'week_end' => $this->week_end->toDateString(),
            'week_number' => $this->week_number,
            'year' => $this->year,
            
            'current_week' => [
                'courses_enrolled' => $this->courses_enrolled_current,
                'courses_completed' => $this->courses_completed_current,
                'lessons_completed' => $this->lessons_completed_current,
                'watch_time' => $this->getWatchTimeCurrentFormattedAttribute(),
                'watch_time_seconds' => $this->watch_time_seconds_current,
                'meetings_attended' => $this->meetings_attended_current,
                'webinars_attended' => $this->webinars_attended_current,
            ],
            
            'previous_week' => [
                'courses_enrolled' => $this->courses_enrolled_previous,
                'courses_completed' => $this->courses_completed_previous,
                'lessons_completed' => $this->lessons_completed_previous,
                'watch_time' => $this->getWatchTimePreviousFormattedAttribute(),
                'watch_time_seconds' => $this->watch_time_seconds_previous,
                'meetings_attended' => $this->meetings_attended_previous,
                'webinars_attended' => $this->webinars_attended_previous,
            ],
            
            'comparison' => [
                'courses_completed' => [
                    'change' => $this->getComparisonChange('courses_completed'),
                    'trend' => $this->getTrend('courses_completed'),
                ],
                'lessons_completed' => [
                    'change' => $this->getComparisonChange('lessons_completed'),
                    'trend' => $this->getTrend('lessons_completed'),
                ],
                'watch_time' => [
                    'change' => $this->getComparisonChange('watch_time_seconds'),
                    'trend' => $this->getTrend('watch_time_seconds'),
                ],
            ],
            
            'status_message' => $this->status_message,
            'next_week_goals' => $this->next_week_goals,
            
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}