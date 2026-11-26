<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BookingConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Session\CancelSessionRequest;
use App\Http\Requests\Session\CreateSessionRequest;
use App\Http\Requests\Session\UpdateSessionRequest;
use App\Http\Resources\SessionResource;
use App\Mail\SessionBookingConfirmation;
use App\Models\MentorSession;
use App\Models\User;
use App\Repositories\SessionRepository;
use App\Services\Microsoft\AvailabilityService;
use App\Services\Microsoft\MicrosoftGraphService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;

class SessionController extends Controller
{
    public function __construct(
        private readonly SessionRepository $sessions,
        private readonly MicrosoftGraphService $graph,
        private readonly AvailabilityService $availability,
    ) {}

    /**
     * GET /api/sessions
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', MentorSession::class);

        $paginator = $this->sessions->paginateForUser($request->user(), [
            'status' => $request->query('status'),
            'from' => $request->query('from'),
            'to' => $request->query('to'),
            'per_page' => $request->integer('per_page', 15),
        ]);

        return response()->json([
            'success' => true,
            'data' => SessionResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/sessions/availability
     */
    public function availability(Request $request): JsonResponse
    {
        $request->validate([
            'mentor_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'timezone' => 'nullable|string|max:64',
        ]);

        $mentor = User::findOrFail($request->integer('mentor_id'));

        if (!$mentor->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Selected user is not a mentor.',
            ], 422);
        }

        $timezone = $request->string('timezone', 'UTC')->toString();
        $date = Carbon::parse($request->string('date')->toString(), $timezone);

        $this->availability->seedDefaultWorkingHours($mentor, $timezone);

        $slots = $this->availability->getAvailableSlots($mentor, $date, $timezone);

        return response()->json([
            'success' => true,
            'data' => [
                'mentor_id' => $mentor->id,
                'date' => $date->toDateString(),
                'timezone' => $timezone,
                'slots' => $slots,
            ],
        ]);
    }

    /**
     * POST /api/sessions
     */
    public function store(CreateSessionRequest $request): JsonResponse
    {
        Gate::authorize('create', MentorSession::class);

        $user = $request->user();
        $timezone = $request->string('timezone', 'UTC')->toString();
        $start = Carbon::parse($request->input('start_time'), $timezone);
        $end = Carbon::parse($request->input('end_time'), $timezone);

        $mentorId = $user->isInstructor()
            ? $user->id
            : (int) $request->input('mentor_id');

        $studentId = $user->isLearner()
            ? $user->id
            : (int) $request->input('student_id');

        $mentor = User::findOrFail($mentorId);
        $student = User::findOrFail($studentId);

        if (!$mentor->isInstructor()) {
            return response()->json(['success' => false, 'message' => 'Invalid mentor.'], 422);
        }

        if (!$this->availability->isSlotAvailable($mentor, $start, $end)) {
            throw new BookingConflictException('Selected time slot is not available.');
        }

        $session = DB::transaction(function () use ($request, $mentor, $student, $start, $end, $timezone) {
            if ($this->sessions->hasConflict($mentor->id, $start, $end)) {
                throw new BookingConflictException('This mentor already has a session at this time.');
            }

            $teamsMeeting = $this->graph->createTeamsMeeting($mentor, [
                'subject' => $request->input('subject'),
                'start_time' => $start->format('Y-m-d\TH:i:s'),
                'end_time' => $end->format('Y-m-d\TH:i:s'),
            ]);

            $calendarEvent = $this->graph->createCalendarEvent($mentor, [
                'subject' => $request->input('subject'),
                'description' => $request->input('description'),
                'start_time' => $start->format('Y-m-d\TH:i:s'),
                'end_time' => $end->format('Y-m-d\TH:i:s'),
                'timezone' => $timezone,
                'attendees' => [$student->email],
                'join_url' => $teamsMeeting['joinWebUrl'] ?? null,
            ]);

            return $this->sessions->create([
                'mentor_id' => $mentor->id,
                'student_id' => $student->id,
                'event_id' => $calendarEvent['id'] ?? null,
                'meeting_id' => $teamsMeeting['id'] ?? null,
                'join_url' => $teamsMeeting['joinWebUrl'] ?? ($calendarEvent['onlineMeeting']['joinUrl'] ?? null),
                'subject' => $request->input('subject'),
                'description' => $request->input('description'),
                'start_time' => $start,
                'end_time' => $end,
                'status' => 'scheduled',
                'timezone' => $timezone,
            ]);
        });

        $session->load(['mentor', 'student']);

        try {
            Mail::to($student->email)->send(new SessionBookingConfirmation($session));
        } catch (\Throwable) {
            // Booking succeeded; email failure should not roll back.
        }

        return response()->json([
            'success' => true,
            'message' => 'Session booked successfully.',
            'data' => new SessionResource($session),
        ], 201);
    }

    /**
     * GET /api/sessions/{id}
     */
    public function show(MentorSession $session): JsonResponse
    {
        Gate::authorize('view', $session);
        $session->load(['mentor', 'student']);

        return response()->json([
            'success' => true,
            'data' => new SessionResource($session),
        ]);
    }

    /**
     * PUT /api/sessions/{id}
     */
    public function update(UpdateSessionRequest $request, MentorSession $session): JsonResponse
    {
        Gate::authorize('update', $session);

        if (!$session->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Only active sessions can be rescheduled.',
            ], 422);
        }

        $timezone = $request->string('timezone', $session->timezone)->toString();
        $start = $request->filled('start_time')
            ? Carbon::parse($request->input('start_time'), $timezone)
            : $session->start_time;
        $end = $request->filled('end_time')
            ? Carbon::parse($request->input('end_time'), $timezone)
            : $session->end_time;

        $mentor = $session->mentor;

        if (!$this->availability->isSlotAvailable($mentor, $start, $end, $session->id)) {
            throw new BookingConflictException('Selected time slot is not available.');
        }

        $updated = DB::transaction(function () use ($request, $session, $mentor, $start, $end, $timezone) {
            if ($this->sessions->hasConflict($mentor->id, $start, $end, $session->id)) {
                throw new BookingConflictException('This mentor already has a session at this time.');
            }

            if ($session->event_id) {
                try {
                    $this->graph->updateCalendarEvent($mentor, $session->event_id, [
                        'subject' => $request->input('subject', $session->subject),
                        'description' => $request->input('description', $session->description),
                        'start_time' => $start->format('Y-m-d\TH:i:s'),
                        'end_time' => $end->format('Y-m-d\TH:i:s'),
                        'timezone' => $timezone,
                    ]);
                } catch (\Throwable) {
                    // Persist reschedule locally even if Outlook sync fails.
                }
            }

            return $this->sessions->update($session, [
                'subject' => $request->input('subject', $session->subject),
                'description' => $request->input('description', $session->description),
                'start_time' => $start,
                'end_time' => $end,
                'timezone' => $timezone,
                'status' => 'rescheduled',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Session rescheduled successfully.',
            'data' => new SessionResource($updated),
        ]);
    }

    /**
     * DELETE /api/sessions/{id}
     */
    public function destroy(CancelSessionRequest $request, MentorSession $session): JsonResponse
    {
        Gate::authorize('delete', $session);

        if ($session->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Session is already cancelled.',
            ], 422);
        }

        DB::transaction(function () use ($session) {
            if ($session->event_id) {
                try {
                    $this->graph->deleteCalendarEvent($session->mentor, $session->event_id);
                } catch (\Throwable) {
                    // Local cancellation should succeed even if Graph sync fails.
                }
            }

            $this->sessions->update($session, ['status' => 'cancelled']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Session cancelled successfully.',
        ]);
    }
}
