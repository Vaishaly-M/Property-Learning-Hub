<?php

namespace App\Http\Controllers\Api\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use App\Models\MeetingRegistration;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class MeetingController extends Controller
{
    // -----------------------------------------------------------------------
    // CRUD METHODS (FIXED)
    // -----------------------------------------------------------------------

    public function index(Request $request)
    {
        try {
            $meetings = Meeting::byInstructor(Auth::id())
                ->latest()
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $meetings
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

   public function store(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'required|in:one-on-one,group,team',
            'date'        => 'required|date',
            'time'        => 'required',
            'duration'    => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $meeting = Meeting::create([
            'title'         => $request->title,
            'description'   => $request->description,
            'type'          => $request->type,
            'date'          => $request->date,
            'time'          => $request->time,
            'duration'      => $request->duration,
            'status'        => 'scheduled',
            'instructor_id' => Auth::id(),
            'meeting_link'  => $request->meeting_link,
            'waiting_room'  => $request->waiting_room ?? false,
            'allow_recording' => $request->allow_recording ?? false,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $meeting,
            'message' => 'Meeting created successfully',
        ]);
    } catch (\Exception $e) {
        return $this->serverError($e);
    }
}

    public function show($id)
    {
        try {
            $meeting = $this->findOwnMeeting($id);

            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            return response()->json([
                'success' => true,
                'data'    => $meeting
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function startMeeting($id)
{
    try {
        $meeting = $this->findOwnMeeting($id);
        if (!$meeting) return $this->notFound('Meeting');

        if ($meeting->status !== 'scheduled') {
            return response()->json([
                'success' => false,
                'message' => 'Only scheduled meetings can be started'
            ], 422);
        }

        $meeting->update([
            'status' => 'in-progress',
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $meeting,
            'message' => 'Meeting started'
        ]);
    } catch (\Exception $e) {
        return $this->serverError($e);
    }
}

public function completeMeeting($id)
{
    try {
        $meeting = $this->findOwnMeeting($id);
        if (!$meeting) return $this->notFound('Meeting');

        if ($meeting->status !== 'in-progress') {
            return response()->json([
                'success' => false,
                'message' => 'Only in-progress meetings can be completed'
            ], 422);
        }

        $meeting->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $meeting,
            'message' => 'Meeting completed'
        ]);
    } catch (\Exception $e) {
        return $this->serverError($e);
    }
}

public function cancelMeeting($id)
{
    try {
        $meeting = $this->findOwnMeeting($id);
        if (!$meeting) return $this->notFound('Meeting');

        if ($meeting->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Completed meetings cannot be cancelled'
            ], 422);
        }

        $meeting->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'success' => true,
            'data' => $meeting,
            'message' => 'Meeting cancelled'
        ]);
    } catch (\Exception $e) {
        return $this->serverError($e);
    }
}

   public function update(Request $request, $id)
{
    try {
        $meeting = $this->findOwnMeeting($id);
        if (!$meeting) {
            return $this->notFound('Meeting');
        }

        $validator = Validator::make($request->all(), [
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'sometimes|in:one-on-one,group,team',
            'date'        => 'sometimes|date',
            'time'        => 'sometimes',
            'duration'    => 'sometimes|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $meeting->update($request->only([
            'title',
            'description',
            'type',
            'date',
            'time',
            'duration',
            'meeting_link',
            'waiting_room',
            'allow_recording',
        ]));

        return response()->json([
            'success' => true,
            'data'    => $meeting,
            'message' => 'Meeting updated',
        ]);
    } catch (\Exception $e) {
        return $this->serverError($e);
    }
}

    public function destroy($id)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $meeting->delete();

            return response()->json([
                'success' => true,
                'message' => 'Meeting deleted',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // PARTICIPANTS MANAGEMENT
    // -----------------------------------------------------------------------

    public function participants(Request $request, $id)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $participants = $meeting->participants()
                ->with('user:id,first_name,last_name,email,role')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data'    => $participants,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function addParticipants(Request $request, $id)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            if ($meeting->status !== 'scheduled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Participants can only be added to scheduled meetings',
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'participant_ids'   => 'required|array',
                'participant_ids.*' => 'exists:users,id',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $added = [];

            foreach ($request->participant_ids as $userId) {
                $existing = MeetingParticipant::where('meeting_id', $meeting->id)
                    ->where('user_id', $userId)
                    ->first();

                if (!$existing) {
                    $user = User::find($userId);
                    $role = ($user->role === 'admin') ? 'admin' : 'learner';

                    $participant = MeetingParticipant::create([
                        'meeting_id' => $meeting->id,
                        'user_id'    => $userId,
                        'role'       => $role,
                        'status'     => 'pending',
                        'invited_at' => now(),
                    ]);

                    $added[] = $participant;
                }
            }

            return response()->json([
                'success' => true,
                'data'    => $added,
                'message' => count($added) . ' participants added',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function removeParticipant($id, $userId)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            if ($meeting->status !== 'scheduled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Participants can only be removed from scheduled meetings',
                ], 422);
            }

            if ($userId == Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot remove yourself as instructor',
                ], 422);
            }

            $participant = MeetingParticipant::where('meeting_id', $meeting->id)
                ->where('user_id', $userId)
                ->first();

            if (!$participant) {
                return $this->notFound('Participant');
            }

            $participant->delete();

            return response()->json([
                'success' => true,
                'message' => 'Participant removed',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function updateParticipantStatus(Request $request, $id, $userId)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $participant = MeetingParticipant::where('meeting_id', $meeting->id)
                ->where('user_id', $userId)
                ->first();

            if (!$participant) {
                return $this->notFound('Participant');
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:confirmed,declined',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $participant->update([
                'status'       => $request->status,
                'responded_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'data'    => $participant->fresh(),
                'message' => 'Participant status updated',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }
    public function stats()
{
    try {
        $instructorId = Auth::id();

        $meetings = Meeting::byInstructor($instructorId);

        $data = [
            'meetings' => [
                'total' => (clone $meetings)->whereIn('status', ['scheduled', 'completed'])->count(),
                'upcoming' => (clone $meetings)->where('status', 'scheduled')->count(),
                'in_progress' => (clone $meetings)->where('status', 'in-progress')->count(),
                'completed' => (clone $meetings)->where('status', 'completed')->count(),
                'cancelled' => (clone $meetings)->where('status', 'cancelled')->count(),
            ],
            'total_participants' => MeetingParticipant::whereHas('meeting', function ($q) use ($instructorId) {
                $q->where('instructor_id', $instructorId);
            })->count(),
            'pending_registrations' => MeetingRegistration::whereHas('meeting', function ($q) use ($instructorId) {
                $q->where('instructor_id', $instructorId);
            })->where('status', 'pending')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    } catch (\Exception $e) {
        return $this->serverError($e);
    }
}

    // -----------------------------------------------------------------------
    // REGISTRATIONS MANAGEMENT (UNCHANGED)
    // -----------------------------------------------------------------------

    public function registrations(Request $request, $id)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $query = $meeting->registrations()
                ->with('learner:id,first_name,last_name,email')
                ->orderBy('created_at', 'desc');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $registrations = $query->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data'    => $registrations,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function approveRegistration($id, $registrationId)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $registration = MeetingRegistration::where('meeting_id', $id)
                ->where('id', $registrationId)
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            if ($meeting->isFull()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Meeting is at full capacity',
                ], 422);
            }

            DB::beginTransaction();

            $registration->update([
                'status'      => 'approved',
                'approved_at' => now(),
            ]);

            MeetingParticipant::firstOrCreate(
                ['meeting_id' => $meeting->id, 'user_id' => $registration->learner_id],
                [
                    'role'         => 'learner',
                    'status'       => 'confirmed',
                    'invited_at'   => now(),
                    'responded_at' => now(),
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'data'    => $registration->fresh('learner'),
                'message' => 'Registration approved',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e);
        }
    }

    public function rejectRegistration(Request $request, $id, $registrationId)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $registration = MeetingRegistration::where('meeting_id', $id)
                ->where('id', $registrationId)
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            $registration->update([
                'status'           => 'rejected',
                'rejected_at'      => now(),
                'rejection_reason' => $request->reason,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $registration->fresh(),
                'message' => 'Registration rejected',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function bulkApproveRegistrations(Request $request, $id)
    {
        try {
            $meeting = $this->findOwnMeeting($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            DB::beginTransaction();

            $registrations = MeetingRegistration::where('meeting_id', $id)
                ->whereIn('id', $request->registration_ids)
                ->where('status', 'pending')
                ->get();

            foreach ($registrations as $registration) {
                $registration->update([
                    'status'      => 'approved',
                    'approved_at' => now(),
                ]);

                MeetingParticipant::firstOrCreate(
                    ['meeting_id' => $meeting->id, 'user_id' => $registration->learner_id],
                    [
                        'role' => 'learner',
                        'status' => 'confirmed',
                        'invited_at' => now(),
                        'responded_at' => now(),
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $registrations->count() . ' registrations approved',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // HELPERS
    // -----------------------------------------------------------------------

    private function findOwnMeeting(int $id): ?Meeting
    {
        return Meeting::byInstructor(Auth::id())->find($id);
    }

    private function notFound(string $resource)
    {
        return response()->json([
            'success' => false,
            'message' => "{$resource} not found",
        ], 404);
    }

    private function validationError($validator)
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors'  => $validator->errors(),
        ], 422);
    }

    private function serverError(\Exception $e)
    {
        return response()->json([
            'success' => false,
            'message' => 'Server error: ' . $e->getMessage(),
        ], 500);
    }
}