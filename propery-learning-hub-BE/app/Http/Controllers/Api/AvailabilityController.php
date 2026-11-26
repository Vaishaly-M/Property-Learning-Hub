<?php

namespace App\Http\Controllers\Api;

use App\DTOs\AvailabilityQueryDTO;
use App\Http\Controllers\Controller;
use App\Repositories\AvailabilitySettingRepository;
use App\Services\Meetings\MeetingAvailabilityService;
use App\Support\MeetingProviders;
use App\Support\TimezoneHelper;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    public function __construct(
        private readonly MeetingAvailabilityService $availability,
        private readonly AvailabilitySettingRepository $settings,
    ) {}

    /**
     * GET /api/availability
     * Public — returns admin calendar available slots.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'timezone' => 'nullable|string|max:64',
        ]);

        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($request->string('timezone', $settings->timezone)->toString());
        $date = Carbon::parse($request->string('date')->toString(), $timezone);

        $slots = $this->availability->getAvailableSlots(new AvailabilityQueryDTO($date, $timezone));

        return response()
            ->json([
                'success' => true,
                'data' => [
                    'date' => $date->toDateString(),
                    'timezone' => $timezone,
                    'slot_duration_minutes' => $settings->slot_duration,
                    'working_hours' => [
                        'start' => $settings->working_hours_start,
                        'end' => $settings->working_hours_end,
                    ],
                    'meeting_types' => config('services.microsoft.meeting_types', []),
                    'meeting_providers' => MeetingProviders::available(),
                    'default_meeting_provider' => MeetingProviders::default(),
                    'zoom_enabled' => MeetingProviders::zoomEnabled(),
                    'slots' => $slots,
                    'synced_from' => 'microsoft_graph',
                    'synced_at' => now()->toIso8601String(),
                ],
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    /**
     * GET /api/platform-timezone
     * Public — platform booking/calendar timezone from admin settings.
     */
    public function timezone(): JsonResponse
    {
        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($settings->timezone);

        return response()->json([
            'success' => true,
            'data' => ['timezone' => $timezone],
        ]);
    }
}
