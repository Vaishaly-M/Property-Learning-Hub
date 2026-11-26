<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use App\Models\MeetingRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class MeetingController extends Controller
{
    // -----------------------------------------------------------------------
    // BROWSE MEETINGS
    // -----------------------------------------------------------------------

    public function index(Request $request)
    {
        try {
            $learnerId = Auth::id();

            $query = Meeting::with([
                'instructor:id,first_name,last_name,email',
            ])->whereIn('status', ['scheduled', 'in-progress', 'completed']);

            $query->where(function ($q) use ($learnerId) {
                $q->whereHas('participants', function ($participantQuery) use ($learnerId) {
                    $participantQuery->where('user_id', $learnerId);
                })->orWhereHas('registrations', function ($registrationQuery) use ($learnerId) {
                    $registrationQuery
                        ->where('learner_id', $learnerId)
                        ->whereIn('status', ['registered', 'confirmed']);
                });
            });
                
            if ($request->filled('type')) {
                if ($request->type === 'invited') {
                    $query->whereHas('participants', function ($q) use ($learnerId) {
                        $q->where('user_id', $learnerId);
                    });
                }

                if ($request->type === 'available') {
                    $query->whereDoesntHave('participants', function ($q) use ($learnerId) {
                        $q->where('user_id', $learnerId);
                    });
                }
            }

            if ($request->filled('status')) {
                if ($request->status === 'upcoming') {
                    $query->upcoming();
                } elseif ($request->status === 'completed') {
                    $query->where('status', 'completed');
                } elseif ($request->status === 'in-progress') {
                    $query->liveNow();
                }
            } else {
                $query->whereIn('status', ['scheduled', 'in-progress']);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $perPage  = $request->get('per_page', 10);
            $meetings = $query->paginate($perPage);

            $meetings->getCollection()->transform(function ($meeting) use ($learnerId) {
                $participant                    = $meeting->participants->firstWhere('user_id', $learnerId);
                $meeting->my_participant_status = $participant ? $participant->status : null;
                $meeting->my_registration_status = $this->getRegistrationStatus($meeting->id, $learnerId);
                return $meeting;
            });

            return response()->json([
                'success' => true,
                'data'    => $meetings,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function invitedMeetings(Request $request)
    {
        return $this->index($request);
    }

    public function show($id)
    {
        try {
            $learnerId = Auth::id();

            $meeting = Meeting::invited($learnerId)
                ->with([
                    'instructor:id,first_name,last_name,email',
                    'participants' => function ($q) {
                        $q->with('user:id,first_name,last_name,email,role')
                          ->whereIn('status', ['confirmed', 'attended']);
                    },
                ])
                ->find($id);

            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            $participant                     = $meeting->participants->firstWhere('user_id', $learnerId);
            $meeting->my_participant_status  = $participant ? $participant->status : null;
            $meeting->my_registration_status = $this->getRegistrationStatus($meeting->id, $learnerId);
            $meeting->can_join               = $meeting->canJoin(Auth::user());
            $meeting->is_full                = $meeting->isFull();

            return response()->json([
                'success' => true,
                'data'    => $meeting,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // REGISTRATION (No approval needed)
    // -----------------------------------------------------------------------

    public function register(Request $request, $id)
    {
        try {
            $meeting = Meeting::where('status', 'scheduled')
                ->upcoming()
                ->find($id);

            if (!$meeting) {
                return $this->notFound('Upcoming meeting');
            }

            $learnerId = Auth::id();

            // Check if already a participant
            $existingParticipant = MeetingParticipant::where('meeting_id', $id)
                ->where('user_id', $learnerId)
                ->first();

            if ($existingParticipant) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already a participant in this meeting',
                ], 422);
            }

            // Check if already registered
            $existingRegistration = MeetingRegistration::where('meeting_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            if ($existingRegistration) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already registered for this meeting',
                ], 422);
            }

            // Check capacity
            if ($meeting->isFull()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This meeting is at full capacity',
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'registration_notes' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            // Start transaction to create registration AND participant in one go
            DB::beginTransaction();
            
            try {
                // Create registration with 'registered' status (no approval needed)
                $registration = MeetingRegistration::create([
                    'meeting_id'         => $id,
                    'learner_id'         => $learnerId,
                    'status'             => 'registered', // Direct registration without approval
                    'registration_notes' => $request->registration_notes,
                    'registered_at'      => now(),
                ]);

                // Automatically add as confirmed participant
                // Note: Remove the 'role' field if it doesn't exist or use the correct value
                $participantData = [
                    'meeting_id'    => $id,
                    'user_id'       => $learnerId,
                    'status'        => 'confirmed',
                    'invited_at'    => now(),
                    'responded_at'  => now(),
                ];
                
                // Only add role if the column exists (check your database schema)
                // Common role values might be: 'member', 'attendee', 'learner', etc.
                // Try one of these based on your schema:
                // $participantData['role'] = 'member';
                // $participantData['role'] = 'attendee';
                // Or omit the role field entirely if it has a default value
                
                $participant = MeetingParticipant::create($participantData);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'data'    => [
                        'registration' => $registration,
                        'participant'  => $participant,
                    ],
                    'message' => 'Successfully registered for the meeting! You can now join when the meeting starts.',
                ], 201);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function cancelRegistration($id)
    {
        try {
            $learnerId = Auth::id();
            
            // Find registration
            $registration = MeetingRegistration::where('meeting_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            if ($registration->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration is already cancelled',
                ], 422);
            }

            $meeting = Meeting::find($id);
            if ($meeting && in_array($meeting->status, ['completed', 'in-progress'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel registration for a meeting that is in progress or completed',
                ], 422);
            }

            // Start transaction to remove both registration and participant
            DB::beginTransaction();
            
            try {
                // Update registration status
                $registration->update(['status' => 'cancelled']);

                // Remove participant record
                MeetingParticipant::where('meeting_id', $id)
                    ->where('user_id', $learnerId)
                    ->delete();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Registration cancelled successfully',
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function myRegistrations(Request $request)
    {
        try {
            $query = MeetingRegistration::where('learner_id', Auth::id())
                ->with([
                    'meeting:id,title,description,date,time,duration,status,meeting_link,type,instructor_id',
                    'meeting.instructor:id,first_name,last_name,email',
                ])
                ->orderBy('created_at', 'desc');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $registrations = $query->paginate($request->get('per_page', 10));

            return response()->json([
                'success' => true,
                'data'    => $registrations,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // PARTICIPANT ACTIONS
    // -----------------------------------------------------------------------

    public function joinMeeting($id)
    {
        try {
            $learnerId = Auth::id();

            // Check if user is a confirmed participant OR has an active registration
            $participant = MeetingParticipant::where('meeting_id', $id)
                ->where('user_id', $learnerId)
                ->whereIn('status', ['confirmed', 'attended'])
                ->first();

            // If not a participant, check if they have an active registration
            if (!$participant) {
                $registration = MeetingRegistration::where('meeting_id', $id)
                    ->where('learner_id', $learnerId)
                    ->where('status', 'registered')
                    ->first();
                
                if (!$registration) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You are not registered for this meeting',
                    ], 403);
                }
            }

            $meeting = Meeting::find($id);
            if (!$meeting) {
                return $this->notFound('Meeting');
            }

            // Check if meeting is available to join
            if (!in_array($meeting->status, ['in-progress', 'scheduled'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'This meeting is not available to join',
                ], 422);
            }

            // For scheduled meetings, only allow joining if it's today
            if ($meeting->status === 'scheduled') {
                $meetingDate = new \DateTime($meeting->date);
                $today = new \DateTime();
                if ($meetingDate->format('Y-m-d') !== $today->format('Y-m-d')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You can only join this meeting on the scheduled date',
                    ], 422);
                }
            }

            if (!$meeting->meeting_link) {
                return response()->json([
                    'success' => false,
                    'message' => 'Meeting link is not available',
                ], 422);
            }

            // Update joined_at timestamp if participant exists
            if ($participant && !$participant->joined_at) {
                $participant->update(['joined_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'meeting_link' => $meeting->meeting_link,
                    'meeting'      => $meeting,
                ],
                'message' => 'You can now join the meeting',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function confirmAttendance($id)
    {
        try {
            $participant = MeetingParticipant::where('meeting_id', $id)
                ->where('user_id', Auth::id())
                ->first();

            if (!$participant) {
                return $this->notFound('Invitation');
            }

            if ($participant->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already responded to this invitation',
                ], 422);
            }

            $participant->update([
                'status'       => 'confirmed',
                'responded_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Attendance confirmed',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function declineInvitation($id)
    {
        try {
            $participant = MeetingParticipant::where('meeting_id', $id)
                ->where('user_id', Auth::id())
                ->first();

            if (!$participant) {
                return $this->notFound('Invitation');
            }

            if ($participant->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already responded to this invitation',
                ], 422);
            }

            $participant->update([
                'status'       => 'declined',
                'responded_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invitation declined',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // HELPERS
    // -----------------------------------------------------------------------

    private function getRegistrationStatus($meetingId, $learnerId)
    {
        $registration = MeetingRegistration::where('meeting_id', $meetingId)
            ->where('learner_id', $learnerId)
            ->first();

        return $registration ? $registration->status : null;
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