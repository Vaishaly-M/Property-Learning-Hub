<?php

namespace App\Http\Requests\Meetings;

use App\Repositories\AvailabilitySettingRepository;
use App\Support\TimezoneHelper;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreAvailabilityBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'reason' => 'nullable|string|max:255',
        ];
    }

    protected function prepareForValidation(): void
    {
        $settings = app(AvailabilitySettingRepository::class)->getSettings();
        $timezone = TimezoneHelper::resolve($settings->timezone);

        if ($this->has('start_time') && $this->has('end_time')) {
            $this->merge([
                'start_time' => Carbon::parse($this->input('start_time'), $timezone)->utc()->toDateTimeString(),
                'end_time' => Carbon::parse($this->input('end_time'), $timezone)->utc()->toDateTimeString(),
            ]);
        }
    }
}
