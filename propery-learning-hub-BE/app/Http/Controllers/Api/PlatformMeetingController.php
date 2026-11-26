<?php

namespace App\Http\Controllers\Api;

use App\DTOs\BookMeetingDTO;
use App\Http\Controllers\Controller;
use App\Http\Requests\Meetings\RescheduleMeetingRequest;
use App\Http\Resources\PlatformMeetingResource;
use App\Models\PlatformMeeting;
use App\Repositories\AvailabilitySettingRepository;
use App\Repositories\PlatformMeetingRepository;
use App\Services\Meetings\MeetingBookingService;
use App\Support\MeetingTimeParser;
use App\Support\TimezoneHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PlatformMeetingController extends Controller
{
    public function __construct(
        private readonly PlatformMeetingRepository $meetings,
        private readonly MeetingBookingService $booking,
        private readonly AvailabilitySettingRepository $settings,
    ) {}

    /**
     * GET /api/my-meetings
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $paginator = $this->meetings->paginateForUser($user, $user->email, [
            'status' => $request->query('status'),
            'from' => $request->query('from'),
            'to' => $request->query('to'),
            'timezone' => $request->query('timezone'),
            'per_page' => $request->integer('per_page', 15),
        ]);

        return response()->json([
            'success' => true,
            'data' => PlatformMeetingResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/admin/meetings
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $paginator = $this->meetings->paginateAll([
            'status' => $request->query('status'),
            'from' => $request->query('from'),
            'to' => $request->query('to'),
            'timezone' => $request->query('timezone'),
            'per_page' => $request->integer('per_page', 50),
        ]);

        return response()->json([
            'success' => true,
            'data' => PlatformMeetingResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/meetings/{id}
     */
    public function show(PlatformMeeting $platformMeeting): JsonResponse
    {
        Gate::authorize('view', $platformMeeting);

        return response()->json([
            'success' => true,
            'data' => new PlatformMeetingResource($platformMeeting),
        ]);
    }

    /**
     * PUT /api/meetings/{id}/reschedule
     */
    public function reschedule(RescheduleMeetingRequest $request, PlatformMeeting $platformMeeting): JsonResponse
    {
        Gate::authorize('update', $platformMeeting);

        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($request->string('timezone', $platformMeeting->timezone ?: $settings->timezone)->toString());
        $startUtc = MeetingTimeParser::parseInstant($request->string('start_time')->toString(), $timezone);
        $endUtc = MeetingTimeParser::parseInstant($request->string('end_time')->toString(), $timezone);

        $updated = $this->booking->reschedule($platformMeeting, new BookMeetingDTO(
            name: $platformMeeting->name,
            email: $platformMeeting->email,
            meetingType: $platformMeeting->meeting_type,
            startTime: $startUtc,
            endTime: $endUtc,
            timezone: $timezone,
            userId: $platformMeeting->user_id,
            phone: $platformMeeting->phone,
            notes: $platformMeeting->notes,
            participants: $platformMeeting->participants ?? [],
            meetingProvider: $platformMeeting->meeting_provider ?? 'teams',
        ));

        return response()->json([
            'success' => true,
            'message' => 'Meeting rescheduled successfully.',
            'data' => new PlatformMeetingResource($updated),
        ]);
    }

    /**
     * DELETE /api/meetings/{id}
     */
    public function destroy(PlatformMeeting $platformMeeting): JsonResponse
    {
        return $this->cancel($platformMeeting);
    }

    /**
     * PUT /api/meetings/{id}/cancel
     */
    public function cancel(PlatformMeeting $platformMeeting): JsonResponse
    {
        Gate::authorize('delete', $platformMeeting);

        $this->booking->cancel($platformMeeting);

        return response()->json([
            'success' => true,
            'message' => 'Meeting cancelled successfully.',
        ]);
    }
}
