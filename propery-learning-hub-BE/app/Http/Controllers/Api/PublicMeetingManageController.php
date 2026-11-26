<?php

namespace App\Http\Controllers\Api;

use App\DTOs\BookMeetingDTO;
use App\Http\Controllers\Controller;
use App\Http\Requests\Meetings\RescheduleMeetingRequest;
use App\Http\Resources\PlatformMeetingResource;
use App\Models\PlatformMeeting;
use App\Repositories\AvailabilitySettingRepository;
use App\Services\Meetings\MeetingBookingService;
use App\Support\MeetingTimeParser;
use App\Support\TimezoneHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicMeetingManageController extends Controller
{
    public function __construct(
        private readonly MeetingBookingService $booking,
        private readonly AvailabilitySettingRepository $settings,
    ) {}

    public function show(Request $request, string $uuid): JsonResponse
    {
        $meeting = $this->resolveMeeting($request, $uuid);

        return response()->json([
            'success' => true,
            'data' => new PlatformMeetingResource($meeting),
        ]);
    }

    public function reschedule(RescheduleMeetingRequest $request, string $uuid): JsonResponse
    {
        $meeting = $this->resolveMeeting($request, $uuid);
        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($request->string('timezone', $meeting->timezone ?: $settings->timezone)->toString());
        $startUtc = MeetingTimeParser::parseInstant($request->string('start_time')->toString(), $timezone);
        $endUtc = MeetingTimeParser::parseInstant($request->string('end_time')->toString(), $timezone);

        $updated = $this->booking->reschedule($meeting, new BookMeetingDTO(
            name: $meeting->name,
            email: $meeting->email,
            meetingType: $meeting->meeting_type,
            startTime: $startUtc,
            endTime: $endUtc,
            timezone: $timezone,
            bookingType: $meeting->booking_type,
            userId: $meeting->user_id,
            phone: $meeting->phone,
            notes: $meeting->notes,
            participants: $meeting->participants ?? [],
            meetingProvider: $meeting->meeting_provider ?? 'teams',
        ));

        return response()->json([
            'success' => true,
            'message' => 'Meeting rescheduled successfully.',
            'data' => new PlatformMeetingResource($updated),
        ]);
    }

    public function cancel(Request $request, string $uuid): JsonResponse
    {
        $meeting = $this->resolveMeeting($request, $uuid);
        $this->booking->cancel($meeting);

        return response()->json([
            'success' => true,
            'message' => 'Meeting cancelled successfully.',
        ]);
    }

    private function resolveMeeting(Request $request, string $uuid): PlatformMeeting
    {
        $request->validate(['token' => 'required|string']);

        $meeting = PlatformMeeting::where('uuid', $uuid)
            ->where('manage_token', $request->string('token')->toString())
            ->first();

        if (!$meeting) {
            abort(404, 'Meeting not found or invalid token.');
        }

        return $meeting;
    }
}
