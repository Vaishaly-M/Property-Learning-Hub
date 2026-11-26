<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Meetings\UpdateAvailabilitySettingsRequest;
use App\Repositories\AvailabilitySettingRepository;
use App\Support\TimezoneHelper;
use Illuminate\Http\JsonResponse;

class AvailabilitySettingsController extends Controller
{
    public function __construct(
        private readonly AvailabilitySettingRepository $settings,
    ) {}

    public function show(): JsonResponse
    {
        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($settings->timezone);

        return response()->json([
            'success' => true,
            'data' => [
                'working_hours_start' => substr($settings->working_hours_start, 0, 5),
                'working_hours_end' => substr($settings->working_hours_end, 0, 5),
                'lunch_break_start' => $settings->lunch_break_start ? substr($settings->lunch_break_start, 0, 5) : null,
                'lunch_break_end' => $settings->lunch_break_end ? substr($settings->lunch_break_end, 0, 5) : null,
                'slot_duration' => $settings->slot_duration,
                'timezone' => $timezone,
                'admin_email' => config('services.microsoft.admin_email'),
                'admin_name' => config('services.microsoft.admin_name'),
            ],
        ]);
    }

    public function update(UpdateAvailabilitySettingsRequest $request): JsonResponse
    {
        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($request->string('timezone')->toString());

        $settings->update([
            'working_hours_start' => $request->input('working_hours_start') . ':00',
            'working_hours_end' => $request->input('working_hours_end') . ':00',
            'lunch_break_start' => $request->filled('lunch_break_start') ? $request->input('lunch_break_start') . ':00' : null,
            'lunch_break_end' => $request->filled('lunch_break_end') ? $request->input('lunch_break_end') . ':00' : null,
            'slot_duration' => $request->integer('slot_duration'),
            'timezone' => $timezone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Availability settings updated.',
            'data' => [
                'working_hours_start' => substr($settings->working_hours_start, 0, 5),
                'working_hours_end' => substr($settings->working_hours_end, 0, 5),
                'lunch_break_start' => $settings->lunch_break_start ? substr($settings->lunch_break_start, 0, 5) : null,
                'lunch_break_end' => $settings->lunch_break_end ? substr($settings->lunch_break_end, 0, 5) : null,
                'slot_duration' => $settings->slot_duration,
                'timezone' => $timezone,
            ],
        ]);
    }
}
