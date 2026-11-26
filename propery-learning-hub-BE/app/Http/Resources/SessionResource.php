<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mentor_id' => $this->mentor_id,
            'student_id' => $this->student_id,
            'event_id' => $this->event_id,
            'meeting_id' => $this->meeting_id,
            'join_url' => $this->join_url,
            'subject' => $this->subject,
            'description' => $this->description,
            'start_time' => $this->start_time?->toIso8601String(),
            'end_time' => $this->end_time?->toIso8601String(),
            'status' => $this->status,
            'timezone' => $this->timezone,
            'mentor' => $this->whenLoaded('mentor', fn () => [
                'id' => $this->mentor->id,
                'name' => trim($this->mentor->first_name . ' ' . $this->mentor->last_name),
                'email' => $this->mentor->email,
            ]),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => trim($this->student->first_name . ' ' . $this->student->last_name),
                'email' => $this->student->email,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
