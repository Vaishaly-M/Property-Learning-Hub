<?php

namespace App\Repositories;

use App\Models\AvailabilitySetting;

class AvailabilitySettingRepository
{
    public function getSettings(): AvailabilitySetting
    {
        $settings = AvailabilitySetting::query()->first();

        if ($settings) {
            return $settings;
        }

        return AvailabilitySetting::create([
            'working_hours_start' => config('services.microsoft.working_hours_start', '09:00:00'),
            'working_hours_end' => config('services.microsoft.working_hours_end', '17:00:00'),
            'slot_duration' => (int) config('services.microsoft.slot_duration_minutes', 30),
            'timezone' => config('services.microsoft.default_timezone', 'Europe/London'),
        ]);
    }
}
