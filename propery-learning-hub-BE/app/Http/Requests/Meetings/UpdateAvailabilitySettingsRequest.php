<?php

namespace App\Http\Requests\Meetings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAvailabilitySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'working_hours_start' => 'required|date_format:H:i',
            'working_hours_end' => 'required|date_format:H:i|after:working_hours_start',
            'lunch_break_start' => 'nullable|date_format:H:i',
            'lunch_break_end' => 'nullable|date_format:H:i|after:lunch_break_start',
            'slot_duration' => 'required|integer|in:15,30,45,60',
            'timezone' => 'required|string|max:64',
        ];
    }
}
