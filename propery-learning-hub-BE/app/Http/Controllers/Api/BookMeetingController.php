<?php

namespace App\Http\Controllers\Api;

use App\DTOs\BookMeetingDTO;
use App\Http\Controllers\Controller;
use App\Http\Requests\Meetings\BookMeetingRequest;
use App\Http\Resources\PlatformMeetingResource;
use App\Repositories\AvailabilitySettingRepository;
use App\Services\Meetings\MeetingBookingService;
use App\Support\MeetingTimeParser;
use App\Support\TimezoneHelper;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class BookMeetingController extends Controller
{
    public function __construct(
        private readonly MeetingBookingService $booking,
        private readonly AvailabilitySettingRepository $settings,
    ) {}

    /**
     * POST /api/book-meeting
     * Public or authenticated (learner/mentor).
     */
    public function store(BookMeetingRequest $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($request->string('timezone', $settings->timezone)->toString());

        $startUtc = MeetingTimeParser::parseInstant($request->string('start_time')->toString(), $timezone);
        $endUtc = MeetingTimeParser::parseInstant($request->string('end_time')->toString(), $timezone);

        $name = $user
            ? ($request->filled('name')
                ? $request->string('name')->toString()
                : trim($user->first_name . ' ' . $user->last_name))
            : $request->string('name')->toString();

        $email = $user
            ? ($request->filled('email')
                ? $request->string('email')->toString()
                : $user->email)
            : $request->string('email')->toString();

        $bookingType = 'public';
        if ($user) {
            $bookingType = $user->isInstructor()
                ? 'mentor'
                : ($user->isLearner() ? 'learner' : 'public');
        }

        $meetingType = $request->string('meeting_type')->toString();

        $meeting = $this->booking->book(new BookMeetingDTO(
            name: $name,
            email: $email,
            meetingType: $meetingType,
            startTime: $startUtc,
            endTime: $endUtc,
            timezone: $timezone,
            bookingType: $bookingType,
            userId: $user?->id,
            phone: $request->input('phone'),
            notes: $request->input('notes'),
            participants: $this->normalizeParticipants($request->input('participants', []), $email),
            meetingProvider: $request->string('meeting_provider', 'teams')->toString(),
        ));

        return response()->json([
            'success' => true,
            'message' => 'Meeting booked successfully.',
            'data' => new PlatformMeetingResource($meeting),
        ], 201);
    }

    private function resolveUser(Request $request): ?User
    {
        if ($request->user()) {
            return $request->user();
        }

        $token = $request->bearerToken();

        if (!$token) {
            return null;
        }

        return PersonalAccessToken::findToken($token)?->tokenable;
    }

    /** @return array<int, array{name: string, email: string}> */
    private function normalizeParticipants(mixed $participants, string $primaryEmail): array
    {
        if (!is_array($participants)) {
            return [];
        }

        $normalized = [];
        $seen = [strtolower($primaryEmail)];

        foreach ($participants as $participant) {
            if (!is_array($participant)) {
                continue;
            }

            $email = strtolower(trim((string) ($participant['email'] ?? '')));
            $name = trim((string) ($participant['name'] ?? ''));

            if ($email === '' || in_array($email, $seen, true)) {
                continue;
            }

            $seen[] = $email;
            $normalized[] = ['name' => $name !== '' ? $name : $email, 'email' => $email];
        }

        return $normalized;
    }
}
