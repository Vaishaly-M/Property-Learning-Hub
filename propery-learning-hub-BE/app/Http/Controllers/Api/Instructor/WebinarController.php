<?php

namespace App\Http\Controllers\Api\Instructor;

use App\Exceptions\MediaStorageException;
use App\Http\Controllers\Controller;
use App\Models\Webinar;
use App\Models\WebinarRegistration;
use App\Models\WebinarRecordingAccess;
use App\Models\PastWebinarRecording;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use App\Support\MediaUploadPath;
use App\Mail\WebinarRegistrationRejectedMail;
use App\Support\LearnerNotificationDismissals;
use App\Services\Payments\StripeWebinarPaymentService;
use App\Services\Crm\LearnerAnnouncementService;
use App\Services\Zoom\ZoomApiService;
use App\Exceptions\ZoomApiException;
use App\Services\Crm\CrmContactSyncService;
use App\Services\Crm\WebinarAutomationService;
use App\Models\ContactWebinarRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class WebinarController extends Controller
{
    // -----------------------------------------------------------------------
    // WEBINAR CRUD
    // -----------------------------------------------------------------------

    public function index(Request $request)
    {
        try {
            $query = Webinar::query();

            if (!Auth::user()->isAdmin()) {
                $query->byInstructor(Auth::id());
            }

            $query->with(['learningObjectives', 'tags'])
                ->withCount('registrations')
                ->orderBy('created_at', 'desc');

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 10);
            $webinars = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data'    => $webinars,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function store(Request $request)
    {
        try {
            $this->normalizeWebinarInput($request);

            $settings = app(\App\Repositories\AvailabilitySettingRepository::class)->getSettings();
            $today = now(\App\Support\TimezoneHelper::resolve($settings->timezone))->toDateString();

            $validator = Validator::make($request->all(), [
                'title'                => 'required|string|max:255',
                'description'          => 'required|string',
                'date'                 => 'required|date|after_or_equal:' . $today,
                'time'                 => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
                'duration'             => 'required|integer|in:30,45,60,90,120',
                'category'             => 'required|in:market,investment,tax,legal,beginner',
                'level'                => 'required|in:beginner,intermediate,advanced',
                'price'                => 'required|numeric|min:0',
                'max_attendees'        => 'required|integer|min:1|max:1000',
                'participant_type'     => 'nullable|in:my_learners,all_learners,all_others',
                'live_link'            => 'nullable|url',
                'participate_email'    => 'nullable|email|max:255',
                'learning_objectives'  => 'nullable|array',
                'learning_objectives.*'=> 'nullable|string|max:500',
                'tags'                 => 'nullable|array',
                'tags.*'               => 'nullable|string|max:100',
                'thumbnail'            => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            ], [
                'date.after_or_equal' => 'Webinar date must be today or a future date.',
                'time.regex'          => 'Please enter a valid time (HH:MM).',
                'participant_type.in' => 'Please select who can participate in this webinar.',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $data = $request->only([
                'title', 'description', 'date', 'time', 'duration',
                'category', 'level', 'price', 'max_attendees',
                'participant_type', 'live_link',
            ]);
            $data['instructor_id']     = Auth::id();
            $data['status']            = 'upcoming';
            $isAdmin = in_array(Auth::user()?->role, ['admin', 'super_admin'], true);
            $defaultAudience = $isAdmin ? 'all_learners' : 'my_learners';
            $participantType = $data['participant_type'] ?? $defaultAudience;
            if ($isAdmin && in_array($participantType, ['', 'my_learners', 'all_others'], true)) {
                $participantType = 'all_learners';
            }
            $data['participant_type'] = $participantType;
            $data['time']              = substr((string) $data['time'], 0, 5);

            if ($request->filled('thumbnail_path')) {
                $thumbnailPath = DirectUpload::resolvePath($request, 'thumbnail_path');
                if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
                    return $thumbnailPath;
                }
                $data['thumbnail'] = $thumbnailPath;
            } elseif ($request->hasFile('thumbnail')) {
                $data['thumbnail'] = $this->uploadThumbnail($request->file('thumbnail'));
            }

            // ---- Zoom session creation (Webinar → Meeting fallback) ------------
            $zoomWebinar = null;
            $zoom = app(ZoomApiService::class);

            try {
                $startTime = \Carbon\Carbon::createFromFormat(
                    'Y-m-d H:i',
                    ($data['date'] ?? now()->format('Y-m-d')) . ' ' . ($data['time'] ?? '00:00'),
                    config('app.timezone', 'UTC')
                )->utc()->format('Y-m-d\TH:i:s\Z');

                $zoomPayload = [
                    'topic'      => $data['title'],
                    'type'       => 5,
                    'start_time' => $startTime,
                    'duration'   => $data['duration'] ?? 60,
                    'timezone'   => config('app.timezone', 'UTC'),
                    'agenda'     => $data['description'] ?? '',
                    'settings'   => [
                        'host_video'        => true,
                        'panelists_video'   => true,
                        'practice_session'  => true,
                        'hd_video'          => true,
                        'approval_type'     => 0,
                        'registration_type' => 1,
                        'audio'             => 'both',
                        'auto_recording'    => 'cloud',
                    ],
                ];

                $zoomWebinar = $zoom->provisionWebinarOrMeeting(
                    $zoomPayload,
                    $data['live_link'] ?? null
                );
            } catch (ZoomApiException $e) {
                Log::error('Zoom Webinar creation failed', [
                    'status'   => $e->status,
                    'response' => $e->response,
                    'message'  => $e->getMessage(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Zoom Webinar creation failed: ' . $e->getMessage(),
                    'details' => $e->response
                ], 422);
            }
            // ------------------------------------------------------------------

            $webinar = Webinar::create(array_merge($data, [
                'live_link'             => $zoomWebinar['join_url'] ?? ($data['live_link'] ?? null),
                // Zoom Webinar fields
                'zoom_webinar_id'       => isset($zoomWebinar['id']) ? (string) $zoomWebinar['id'] : null,
                'zoom_join_url'         => $zoomWebinar['join_url'] ?? null,
                'zoom_start_url'        => $zoomWebinar['start_url'] ?? null,
                'zoom_uuid'             => $zoomWebinar['uuid'] ?? null,
                'zoom_password'         => $zoomWebinar['password'] ?? null,
                'zoom_registration_url' => $zoomWebinar['registration_url'] ?? null,
            ]));

            if ($request->filled('learning_objectives')) {
                $webinar->syncLearningObjectives($request->learning_objectives);
            }
            if ($request->filled('tags')) {
                $webinar->syncTags($request->tags);
            }

            // ---- Send Email with Participation Details -----------------------
            if ($request->filled('participate_email')) {
                $participateEmail = strtolower(trim($request->participate_email));
                $user = \App\Models\User::where('email', $participateEmail)->first();
                if ($user) {
                    // This will trigger WebinarRegistrationObserver which handles CRM sync & confirmation
                    \App\Models\WebinarRegistration::firstOrCreate(
                        ['webinar_id' => $webinar->id, 'learner_id' => $user->id],
                        ['status' => 'approved', 'approved_at' => now()]
                    );
                } else {
                    // No platform user, register as a CRM contact and send confirmation
                    $contact = app(CrmContactSyncService::class)->findOrCreateFromBooking(
                        'Participant',
                        $participateEmail,
                        null,
                        null,
                        'webinar creation'
                    );

                    $registration = ContactWebinarRegistration::firstOrCreate(
                        ['webinar_id' => $webinar->id, 'contact_id' => $contact->id],
                        ['status' => 'registered', 'registered_at' => now()]
                    );

                    app(WebinarAutomationService::class)->sendRegistrationConfirmation($registration);
                }
            }
            // ------------------------------------------------------------------

            return response()->json([
                'success' => true,
                'data'    => $webinar->load(['learningObjectives', 'tags']),
                'message' => 'Webinar created successfully',
            ], 201);
        } catch (MediaStorageException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function show($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $webinar->load(['learningObjectives', 'tags', 'registrations.learner:id,first_name,last_name,email']);

            return response()->json([
                'success' => true,
                'data'    => $webinar,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if ($webinar->status === 'cancelled') {
                return response()->json(['success' => false, 'message' => 'Cannot update a cancelled webinar'], 422);
            }

            $this->normalizeWebinarInput($request);

            $settings = app(\App\Repositories\AvailabilitySettingRepository::class)->getSettings();
            $today = now(\App\Support\TimezoneHelper::resolve($settings->timezone))->toDateString();

            $validator = Validator::make($request->all(), [
                'title'                => 'sometimes|required|string|max:255',
                'description'          => 'sometimes|required|string',
                'date'                 => 'sometimes|required|date|after_or_equal:' . $today,
                'time'                 => ['sometimes', 'required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
                'duration'             => 'sometimes|required|integer|in:30,45,60,90,120',
                'category'             => 'sometimes|required|in:market,investment,tax,legal,beginner',
                'level'                => 'sometimes|required|in:beginner,intermediate,advanced',
                'price'                => 'sometimes|required|numeric|min:0',
                'max_attendees'        => 'sometimes|required|integer|min:1|max:1000',
                'participant_type'     => 'sometimes|nullable|in:my_learners,all_learners,all_others',
                'live_link'            => 'nullable|url',
                'learning_objectives'  => 'nullable|array',
                'learning_objectives.*'=> 'nullable|string|max:500',
                'tags'                 => 'nullable|array',
                'tags.*'               => 'nullable|string|max:100',
                'thumbnail'            => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            ], [
                'date.after_or_equal' => 'Webinar date must be today or a future date.',
                'time.regex'          => 'Please enter a valid time (HH:MM).',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $data = $request->only([
                'title', 'description', 'date', 'time', 'duration',
                'category', 'level', 'price', 'max_attendees',
                'participant_type', 'live_link',
            ]);

            if (isset($data['time'])) {
                $data['time'] = substr((string) $data['time'], 0, 5);
            }

            if (array_key_exists('participant_type', $data)) {
                $isAdmin = in_array(Auth::user()?->role, ['admin', 'super_admin'], true);
                if ($isAdmin && in_array($data['participant_type'], [null, '', 'my_learners', 'all_others'], true)) {
                    $data['participant_type'] = 'all_learners';
                }
            }

            if ($request->filled('thumbnail_path')) {
                $thumbnailPath = DirectUpload::resolvePath($request, 'thumbnail_path');
                if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
                    return $thumbnailPath;
                }
                if ($webinar->thumbnail) {
                    MediaStorage::delete($webinar->thumbnail);
                }
                $data['thumbnail'] = $thumbnailPath;
            } elseif ($request->hasFile('thumbnail')) {
                if ($webinar->thumbnail) {
                    MediaStorage::delete($webinar->thumbnail);
                }
                $data['thumbnail'] = $this->uploadThumbnail($request->file('thumbnail'));
            }

            $webinar->update($data);

            // ---- Sync changes to Zoom Webinar (best-effort) ------------------
            if (!empty($webinar->zoom_webinar_id)) {
                try {
                    $zoomPayload = [];

                    if (isset($data['title'])) {
                        $zoomPayload['topic'] = $data['title'];
                    }
                    if (isset($data['description'])) {
                        $zoomPayload['agenda'] = $data['description'];
                    }
                    if (isset($data['duration'])) {
                        $zoomPayload['duration'] = $data['duration'];
                    }
                    // Rebuild start_time when date or time changes
                    $freshWebinar = $webinar->fresh();
                    if (isset($data['date']) || isset($data['time'])) {
                        $zoomPayload['start_time'] = \Carbon\Carbon::createFromFormat(
                            'Y-m-d H:i',
                            $freshWebinar->date->format('Y-m-d') . ' ' . $freshWebinar->time,
                            config('app.timezone', 'UTC')
                        )->utc()->format('Y-m-d\TH:i:s\Z');
                        $zoomPayload['timezone'] = config('app.timezone', 'UTC');
                    }

                    if (!empty($zoomPayload)) {
                        app(ZoomApiService::class)->updateWebinar(
                            $webinar->zoom_webinar_id,
                            $zoomPayload
                        );

                        Log::info('Zoom Webinar updated', [
                            'webinar_id'      => $webinar->id,
                            'zoom_webinar_id' => $webinar->zoom_webinar_id,
                        ]);
                    }
                } catch (ZoomApiException $e) {
                    Log::error('Zoom Webinar update failed (local record already updated)', [
                        'webinar_id'      => $webinar->id,
                        'zoom_webinar_id' => $webinar->zoom_webinar_id,
                        'status'          => $e->status,
                        'response'        => $e->response,
                        'message'         => $e->getMessage(),
                    ]);
                }
            }
            // ------------------------------------------------------------------

            if ($request->has('learning_objectives')) {
                $webinar->syncLearningObjectives($request->learning_objectives ?? []);
            }
            if ($request->has('tags')) {
                $webinar->syncTags($request->tags ?? []);
            }

            return response()->json([
                'success' => true,
                'data'    => $webinar->fresh(['learningObjectives', 'tags']),
                'message' => 'Webinar updated successfully',
            ]);
        } catch (MediaStorageException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function destroy($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if ($webinar->status === 'live') {
                return response()->json(['success' => false, 'message' => 'Cannot delete a live webinar'], 422);
            }

            if ($webinar->thumbnail) {
                MediaStorage::delete($webinar->thumbnail);
            }
            if ($webinar->recording_path) {
                MediaStorage::delete($webinar->recording_path, MediaStorage::isPrivatePath($webinar->recording_path));
            }

            // ---- Delete Zoom Webinar first (best-effort) ---------------------
            if (!empty($webinar->zoom_webinar_id)) {
                try {
                    app(ZoomApiService::class)->deleteWebinar($webinar->zoom_webinar_id);

                    Log::info('Zoom Webinar deleted', [
                        'webinar_id'      => $webinar->id,
                        'zoom_webinar_id' => $webinar->zoom_webinar_id,
                    ]);
                } catch (ZoomApiException $e) {
                    Log::error('Zoom Webinar deletion failed (local record will still be deleted)', [
                        'webinar_id'      => $webinar->id,
                        'zoom_webinar_id' => $webinar->zoom_webinar_id,
                        'status'          => $e->status,
                        'response'        => $e->response,
                        'message'         => $e->getMessage(),
                    ]);
                }
            }
            // ------------------------------------------------------------------

            $webinar->delete();

            return response()->json(['success' => true, 'message' => 'Webinar deleted successfully']);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // WEBINAR STATUS TRANSITIONS
    // -----------------------------------------------------------------------

    public function startWebinar($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if ($webinar->status !== 'upcoming') {
                return response()->json(['success' => false, 'message' => 'Only upcoming webinars can be started'], 422);
            }

            $webinar->update(['status' => 'live', 'started_at' => now()]);
            $webinar = $webinar->fresh()->syncAttendanceMetrics();

            return response()->json([
                'success' => true,
                'data'    => $webinar->fresh(),
                'message' => 'Webinar started successfully',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function completeWebinar($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (!in_array($webinar->status, ['live', 'upcoming'], true)) {
                return response()->json(['success' => false, 'message' => 'Only live or past upcoming webinars can be completed'], 422);
            }

            if ($webinar->status === 'upcoming' && !$webinar->hasScheduledStartPassed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This webinar has not started yet. Start it live or wait until the scheduled time has passed.',
                ], 422);
            }

            $webinar->update([
                'status'     => 'completed',
                'ended_at'   => now(),
                'started_at' => $webinar->started_at ?? now(),
            ]);
            $webinar = $webinar->fresh();
            $webinar->reconcileAttendanceRecords();
            $webinar = $this->syncWebinarAttendanceMetrics($webinar);

            return response()->json([
                'success' => true,
                'data'    => $webinar,
                'message' => 'Webinar marked as completed',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function cancelWebinar($id, StripeWebinarPaymentService $webinarPayments)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (!in_array($webinar->status, ['upcoming', 'live'])) {
                return response()->json(['success' => false, 'message' => 'Only upcoming or live webinars can be cancelled'], 422);
            }

            $activeRegistrations = $webinar->registrations()
                ->whereIn('status', ['registered', 'approved', 'waitlisted'])
                ->get();

            foreach ($activeRegistrations as $registration) {
                $cancelPayload = [
                    'status'           => 'cancelled',
                    'approved_at'      => null,
                    'rejected_at'      => null,
                    'rejection_reason' => null,
                    'attended'         => false,
                    'joined_at'        => null,
                    'left_at'          => null,
                ];

                $isPaidRegistration = $registration->payment_status === 'paid'
                    && !empty($registration->payment_reference);

                if ($isPaidRegistration) {
                    try {
                        $refundData = $webinarPayments->refundRegistration($registration);
                        if (!empty($refundData['refunded'])) {
                            $cancelPayload['payment_status'] = 'refunded';
                        }
                    } catch (\Throwable) {
                        // Continue cancelling registration even if refund fails.
                    }
                }

                if (Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
                    $cancelPayload['manual_attendance'] = false;
                }

                $registration->update($cancelPayload);
                LearnerNotificationDismissals::clearDashboardCache((int) $registration->learner_id);
            }

            // ---- Delete Zoom Webinar (best-effort) ---------------------------
            if (!empty($webinar->zoom_webinar_id)) {
                try {
                    app(ZoomApiService::class)->deleteWebinar($webinar->zoom_webinar_id);

                    Log::info('Zoom Webinar deleted on cancellation', [
                        'webinar_id'      => $webinar->id,
                        'zoom_webinar_id' => $webinar->zoom_webinar_id,
                    ]);
                } catch (ZoomApiException $e) {
                    Log::error('Zoom Webinar deletion failed on cancellation (continuing anyway)', [
                        'webinar_id'      => $webinar->id,
                        'zoom_webinar_id' => $webinar->zoom_webinar_id,
                        'status'          => $e->status,
                        'response'        => $e->response,
                        'message'         => $e->getMessage(),
                    ]);
                }
            }
            // ------------------------------------------------------------------

            $webinar->update(['status' => 'cancelled']);

            return response()->json([
                'success' => true,
                'data'    => $webinar->fresh(),
                'message' => 'Webinar cancelled and active registrations were updated',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // REGISTRATIONS
    // -----------------------------------------------------------------------

    public function registrations(Request $request, $id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $query = $webinar->registrations()
                ->with('learner:id,first_name,last_name,email')
                ->orderBy('created_at', 'desc');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $registrations = $query->paginate($request->get('per_page', 20));

            return response()->json(['success' => true, 'data' => $registrations]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function approveRegistration($webinarId, $registrationId)
    {
        try {
            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $registration = WebinarRegistration::where('webinar_id', $webinarId)
                ->where('id', $registrationId)
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            if ($registration->status === 'approved') {
                return response()->json(['success' => false, 'message' => 'Already approved'], 422);
            }

            if (in_array($webinar->status, ['cancelled'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve registrations for a cancelled webinar',
                ], 422);
            }

            if (!$this->registrationCanBeApproved($registration)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve a ' . $registration->status . ' registration',
                ], 422);
            }

            if ($webinar->isApprovalCapacityReached()) {
                return response()->json(['success' => false, 'message' => 'Webinar is at full capacity'], 422);
            }

            $approvalPayload = [
                'status'      => 'approved',
                'approved_at' => now(),
            ];

            if (in_array($webinar->status, ['live', 'completed'], true)) {
                $approvalPayload['attended']  = true;
                $approvalPayload['joined_at'] = $registration->joined_at ?? now();
            }

            $registration->update($approvalPayload);
            LearnerNotificationDismissals::clearDashboardCache((int) $registration->learner_id);
            $this->syncWebinarAttendanceMetrics($webinar->fresh());

            return response()->json([
                'success' => true,
                'data'    => $registration->fresh('learner'),
                'message' => 'Registration approved',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function rejectRegistration(Request $request, $webinarId, $registrationId, StripeWebinarPaymentService $webinarPayments)
    {
        try {
            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $registration = WebinarRegistration::where('webinar_id', $webinarId)
                ->where('id', $registrationId)
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            if (in_array($webinar->status, ['cancelled'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot reject registrations for a cancelled webinar',
                ], 422);
            }

            if ($registration->status === 'rejected') {
                return response()->json(['success' => false, 'message' => 'Already rejected'], 422);
            }

            if (!$this->registrationCanBeRejected($registration)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot reject a ' . $registration->status . ' registration',
                ], 422);
            }

            $refundData = ['refunded' => false];
            $isPaidRegistration = $registration->payment_status === 'paid'
                && !empty($registration->payment_reference);

            if ($isPaidRegistration) {
                $refundData = $webinarPayments->refundRegistration($registration);
            }

            $registration->update([
                'status'           => 'rejected',
                'rejected_at'      => now(),
                'rejection_reason' => $request->reason,
                'approved_at'      => null,
                'attended'         => false,
                'joined_at'        => null,
                'left_at'          => null,
                'payment_status'   => !empty($refundData['refunded'])
                    ? 'refunded'
                    : $registration->payment_status,
            ]);

            $registration = $registration->fresh('learner');

            $this->notifyLearnerOfRejectedRegistration($webinar, $registration, $refundData);

            LearnerNotificationDismissals::clearDashboardCache((int) $registration->learner_id);

            return response()->json([
                'success' => true,
                'data'    => $registration,
                'refund'  => $refundData,
                'message' => !empty($refundData['refunded'])
                    ? 'Registration rejected and refund initiated'
                    : ($isPaidRegistration
                        ? 'Registration rejected. Refund could not be processed automatically — contact support.'
                        : 'Registration rejected'),
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function bulkApprove(Request $request, $webinarId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'registration_ids'   => 'required|array',
                'registration_ids.*' => 'integer',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (in_array($webinar->status, ['cancelled', 'completed'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot bulk approve registrations for a ' . $webinar->status . ' webinar',
                ], 422);
            }

            $currentApproved = $webinar->approvedRegistrations()->count();

            $registrationsToApprove = WebinarRegistration::where('webinar_id', $webinarId)
                ->whereIn('id', $request->registration_ids)
                ->whereIn('status', ['registered', 'waitlisted'])
                ->get();

            $toApprove = $registrationsToApprove->count();

            if ($toApprove === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No pending registrations selected for approval',
                ], 422);
            }

            if ($currentApproved + $toApprove > $webinar->maxCapacity()) {
                return response()->json([
                    'success' => false,
                    'message' => "Approving {$toApprove} registrations would exceed max_attendees ({$webinar->maxCapacity()})",
                ], 422);
            }

            $bulkPayload = [
                'status'      => 'approved',
                'approved_at' => now(),
            ];

            $registrationsToApprove->each(function (WebinarRegistration $registration) use ($bulkPayload) {
                    $registration->update($bulkPayload);
                    LearnerNotificationDismissals::clearDashboardCache((int) $registration->learner_id);
                });

            $this->syncWebinarAttendanceMetrics($webinar->fresh());

            return response()->json(['success' => true, 'message' => 'Registrations approved']);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function markAttendance(Request $request, $webinarId, $registrationId)
    {
        try {
            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $registration = WebinarRegistration::where('webinar_id', $webinarId)
                ->where('id', $registrationId)
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            $validator = Validator::make($request->all(), [
                'attended'   => 'required|boolean',
                'watch_time' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            if ($registration->status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only approved registrations can have attendance updated',
                ], 422);
            }

            $attendancePayload = [
                'attended'   => $request->boolean('attended'),
                'watch_time' => $request->watch_time ?? $registration->watch_time,
                'joined_at'  => $request->boolean('attended')
                    ? ($registration->joined_at ?? now())
                    : null,
                'left_at'    => $request->boolean('attended') ? null : now(),
            ];

            if (Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
                $attendancePayload['manual_attendance'] = true;
            }

            $registration->update($attendancePayload);

            $this->syncWebinarAttendanceMetrics($webinar->fresh());

            return response()->json([
                'success' => true,
                'data'    => $registration->fresh(),
                'message' => 'Attendance updated',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function exportRegistrants($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $registrations = $webinar->registrations()
                ->with('learner:id,first_name,last_name,email')
                ->get();

            $rows   = ["Name,Email,Status,Registered At,Attended,Watch Time (min)"];
            foreach ($registrations as $reg) {
                $name = $reg->learner->first_name . ' ' . $reg->learner->last_name;
                $rows[] = implode(',', [
                    "\"{$name}\"",
                    $reg->learner->email,
                    $reg->status,
                    $reg->created_at->toDateTimeString(),
                    $reg->attended ? 'Yes' : 'No',
                    $reg->watch_time ?? 0,
                ]);
            }

            $csv = implode("\n", $rows);

            return response($csv, 200, [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . Str::slug($webinar->title) . '_registrants.csv"',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function sendReminders($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if ($webinar->status !== 'upcoming') {
                return response()->json(['success' => false, 'message' => 'Reminders can only be sent for upcoming webinars'], 422);
            }

            $count = $webinar->registrations()
                ->where('status', 'approved')
                ->count();

            // TODO: dispatch(new SendWebinarReminders($webinar));

            return response()->json([
                'success' => true,
                'message' => "Reminders queued for {$count} approved registrant(s)",
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // RECORDING MANAGEMENT
    // -----------------------------------------------------------------------

    public function uploadRecording(Request $request, $id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if ($webinar->status !== 'completed') {
                return response()->json(['success' => false, 'message' => 'Recordings can only be uploaded for completed webinars'], 422);
            }

            $validator = Validator::make($request->all(), [
                'recording' => 'nullable|file|mimes:mp4,mov,avi,webm|max:2048000',
                'recording_path' => 'nullable|string|max:500',
                'recording_original_name' => 'nullable|string|max:255',
                'recording_size' => 'nullable|integer|min:1',
                'recording_mime_type' => 'nullable|string|max:127',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            if (!$request->hasFile('recording') && !$request->filled('recording_path')) {
                return response()->json(['success' => false, 'message' => 'Recording file is required.'], 422);
            }

            if ($webinar->recording_path) {
                MediaStorage::delete($webinar->recording_path, MediaStorage::isPrivatePath($webinar->recording_path));
            }

            if ($request->filled('recording_path')) {
                $uploaded = DirectUpload::resolveFileMeta(
                    $request,
                    'recording_path',
                    'recording_original_name',
                    'recording_size',
                    'recording_mime_type',
                );
                if ($uploaded instanceof \Illuminate\Http\JsonResponse) {
                    return $uploaded;
                }

                $webinar->update([
                    'recording_path'          => $uploaded['path'],
                    'recording_original_name' => $uploaded['name'],
                    'recording_size'          => $uploaded['size'],
                    'recording_mime_type'     => $uploaded['mime'],
                ]);
            } else {
                $file     = $request->file('recording');
                $filename = 'webinar_' . $id . '_' . Str::random(16) . '.' . $file->getClientOriginalExtension();
                $path     = MediaStorage::storePrivate($file, 'webinar-recordings', $filename);

                $webinar->update([
                    'recording_path'          => $path,
                    'recording_original_name' => $file->getClientOriginalName(),
                    'recording_size'          => $file->getSize(),
                    'recording_mime_type'     => $file->getMimeType(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Recording uploaded successfully',
                'data'    => [
                    'recording_original_name' => $webinar->recording_original_name,
                    'recording_size'          => $webinar->recording_size,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function deleteRecording($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (!$webinar->recording_path) {
                return response()->json(['success' => false, 'message' => 'No recording to delete'], 422);
            }

            MediaStorage::delete($webinar->recording_path, MediaStorage::isPrivatePath($webinar->recording_path));
            $webinar->update([
                'recording_path'          => null,
                'recording_original_name' => null,
                'recording_size'          => null,
                'recording_mime_type'     => null,
            ]);

            return response()->json(['success' => true, 'message' => 'Recording deleted']);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // RECORDING ACCESS REQUESTS
    // -----------------------------------------------------------------------

    public function recordingAccessRequests(Request $request, $id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $query = $webinar->recordingAccessRequests()
                ->with('learner:id,first_name,last_name,email')
                ->orderBy('created_at', 'desc');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            return response()->json([
                'success' => true,
                'data'    => $query->paginate($request->get('per_page', 20)),
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function approveRecordingAccess(Request $request, $webinarId, $accessId)
    {
        try {
            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (!$webinar->hasRecording()) {
                return response()->json(['success' => false, 'message' => 'No recording available'], 422);
            }

            $access = WebinarRecordingAccess::where('webinar_id', $webinarId)
                ->where('id', $accessId)
                ->first();

            if (!$access) {
                return $this->notFound('Access request');
            }

            $expiresAt = null;
            if ($request->filled('expires_days')) {
                $expiresAt = now()->addDays($request->expires_days);
            }

            $access->update([
                'status'      => 'approved',
                'approved_at' => now(),
                'expires_at'  => $expiresAt,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $access->fresh('learner'),
                'message' => 'Recording access approved',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function rejectRecordingAccess(Request $request, $webinarId, $accessId)
    {
        try {
            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $access = WebinarRecordingAccess::where('webinar_id', $webinarId)
                ->where('id', $accessId)
                ->first();

            if (!$access) {
                return $this->notFound('Access request');
            }

            $access->update([
                'status'           => 'rejected',
                'rejected_at'      => now(),
                'rejection_reason' => $request->reason,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $access->fresh('learner'),
                'message' => 'Recording access rejected',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function revokeRecordingAccess($webinarId, $accessId)
    {
        try {
            $webinar = $this->findOwnWebinar($webinarId);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $access = WebinarRecordingAccess::where('webinar_id', $webinarId)
                ->where('id', $accessId)
                ->where('status', 'approved')
                ->first();

            if (!$access) {
                return $this->notFound('Approved access request');
            }

            $access->update(['status' => 'revoked']);

            return response()->json(['success' => true, 'message' => 'Recording access revoked']);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // PAST RECORDINGS
    // -----------------------------------------------------------------------

    public function getPastRecordings()
    {
        try {
            $recordingsQuery = PastWebinarRecording::query();
            if (!Auth::user()->isAdmin()) {
                $recordingsQuery->where('instructor_id', Auth::id());
            }
            $recordings = $recordingsQuery
                ->orderBy('recorded_at', 'desc')
                ->get();
                
            // Add full URLs
            $recordings->transform(function ($recording) {
                $recording->video_url = MediaUrl::videoPlaybackUrl($recording->video_path);
                if ($recording->thumbnail_path) {
                    $recording->thumbnail_url = MediaUrl::url($recording->thumbnail_path);
                }
                return $recording;
            });
            
            return response()->json(['success' => true, 'data' => $recordings]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function storePastRecording(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'title'        => 'required|string|max:255',
                'description'  => 'nullable|string',
                'recorded_at'  => 'nullable|date',
                'duration'     => 'required|integer|min:1',
                'video'        => 'nullable|file|mimes:mp4,mov,avi,webm|max:2048000',
                'video_path'   => 'nullable|string|max:500',
                'video_name'   => 'nullable|string|max:255',
                'video_size'   => 'nullable|integer|min:1',
                'thumbnail'    => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
                'thumbnail_path' => 'nullable|string|max:500',
            ]);
            
            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            if (!$request->hasFile('video') && !$request->filled('video_path')) {
                return response()->json(['success' => false, 'message' => 'Video file is required.'], 422);
            }
            
            if ($request->filled('video_path')) {
                $uploaded = DirectUpload::resolveFileMeta(
                    $request,
                    'video_path',
                    'video_name',
                    'video_size',
                );
                if ($uploaded instanceof \Illuminate\Http\JsonResponse) {
                    return $uploaded;
                }
                $videoPath = $uploaded['path'];
            } else {
                $videoPath = $this->uploadVideo($request->file('video'));
            }

            if ($request->filled('thumbnail_path')) {
                $thumbnailPath = DirectUpload::resolvePath($request, 'thumbnail_path');
                if ($thumbnailPath instanceof \Illuminate\Http\JsonResponse) {
                    return $thumbnailPath;
                }
            } elseif ($request->hasFile('thumbnail')) {
                $thumbnailPath = $this->uploadThumbnail($request->file('thumbnail'));
            } else {
                $thumbnailPath = null;
            }
                
            $recording = PastWebinarRecording::create([
                'instructor_id' => Auth::id(),
                'title' => $request->title,
                'description' => $request->description,
                'video_path' => $videoPath,
                'thumbnail_path' => $thumbnailPath,
                'recorded_at' => $request->recorded_at ?? now(),
                'duration' => $request->duration,
                'views' => 0,
            ]);
            
            // Add URLs to response
            $recording->video_url = MediaUrl::videoPlaybackUrl($recording->video_path);
            if ($recording->thumbnail_path) {
                $recording->thumbnail_url = MediaUrl::url($recording->thumbnail_path);
            }
            
            return response()->json([
                'success' => true,
                'data' => $recording,
                'message' => 'Recording uploaded successfully',
            ], 201);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function deletePastRecording($id)
    {
        try {
            $recording = PastWebinarRecording::query();
            if (!Auth::user()->isAdmin()) {
                $recording->where('instructor_id', Auth::id());
            }
            $recording = $recording->where('id', $id)->first();
                
            if (!$recording) {
                return $this->notFound('Recording');
            }
            
            MediaStorage::delete($recording->video_path);
            if ($recording->thumbnail_path) {
                MediaStorage::delete($recording->thumbnail_path);
            }
            
            $recording->delete();
            
            return response()->json(['success' => true, 'message' => 'Recording deleted']);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // ANALYTICS
    // -----------------------------------------------------------------------

    public function stats()
    {
        try {
            $instructorId = Auth::id();

            $total     = Webinar::byInstructor($instructorId)->count();
            $upcoming  = Webinar::byInstructor($instructorId)->where('status', 'upcoming')->count();
            $live      = Webinar::byInstructor($instructorId)->where('status', 'live')->count();
            $completed = Webinar::byInstructor($instructorId)->where('status', 'completed')->count();
            $cancelled = Webinar::byInstructor($instructorId)->where('status', 'cancelled')->count();

            $totalRegistrations = WebinarRegistration::whereHas('webinar', fn ($q) => $q->where('instructor_id', $instructorId))->count();
            $totalApproved      = WebinarRegistration::whereHas('webinar', fn ($q) => $q->where('instructor_id', $instructorId))->where('status', 'approved')->count();
            $totalAttended      = WebinarRegistration::whereHas('webinar', fn ($q) => $q->where('instructor_id', $instructorId))
                ->where('status', 'approved')
                ->where(function ($query) {
                    $query->where('attended', true)
                        ->orWhereNotNull('joined_at');
                })
                ->count();

            $pendingRecordingRequests = $this->pendingRecordingRequestCountForInstructor($instructorId);

            return response()->json([
                'success' => true,
                'data'    => [
                    'webinars' => [
                        'total'     => $total,
                        'upcoming'  => $upcoming,
                        'live'      => $live,
                        'completed' => $completed,
                        'cancelled' => $cancelled,
                    ],
                    'registrations' => [
                        'total'    => $totalRegistrations,
                        'approved' => $totalApproved,
                        'attended' => $totalAttended,
                    ],
                    'pending_recording_requests' => $pendingRecordingRequests,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function webinarAnalytics($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (!in_array($webinar->status, ['live', 'completed'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Analytics are available once the webinar is live or completed',
                ], 422);
            }

            $webinar = $this->syncWebinarAttendanceMetrics($webinar->fresh());

            $totalRegistered = (int) $webinar->registrations()
                ->whereIn('status', ['approved', 'registered', 'waitlisted'])
                ->count();
            $totalAttended = $webinar->countApprovedAttendees(false);
            $totalWatchTime = (int) $webinar->registrations()
                ->where('status', 'approved')
                ->where(function ($query) {
                    $query->where('attended', true)
                        ->orWhereNotNull('joined_at');
                })
                ->sum('watch_time');
            $avgWatchTime     = $totalAttended > 0 ? round($totalWatchTime / $totalAttended, 2) : 0;
            $attendanceRate   = $totalRegistered > 0 ? round(($totalAttended / $totalRegistered) * 100, 2) : 0;
            $contentRetention = $webinar->duration > 0 ? round(($avgWatchTime / $webinar->duration) * 100, 2) : 0;

            $recordingStats = $this->recordingAccessStatsForWebinar($webinar);

            return response()->json([
                'success' => true,
                'data'    => [
                    'total_registered'  => $totalRegistered,
                    'total_attended'    => $totalAttended,
                    'attendance_rate'   => $attendanceRate,
                    'avg_watch_time'    => $avgWatchTime,
                    'content_retention' => $contentRetention,
                    'peak_attendees'    => $webinar->peak_attendees,
                    'engagement_rate'   => $webinar->engagement_rate,
                    'satisfaction_score'=> $webinar->satisfaction_score,
                    'recording'         => $recordingStats,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // PRIVATE HELPERS
    // -----------------------------------------------------------------------

    private function syncWebinarAttendanceMetrics(Webinar $webinar): Webinar
    {
        return $webinar->syncAttendanceMetrics();
    }

    /**
     * Stream recording for instructor/admin (no learner access gate).
     */
    public function streamRecording($id)
    {
        try {
            $webinar = $this->findOwnWebinar($id);
            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            if (!$webinar->recording_path) {
                return $this->notFound('Recording');
            }

            $private = MediaUploadPath::isPrivatePath($webinar->recording_path);

            if (!MediaStorage::exists($webinar->recording_path, $private)) {
                return response()->json(['success' => false, 'message' => 'Recording file not found on server'], 404);
            }

            $url = MediaUrl::playbackUrl($webinar->recording_path, $private);
            if (!$url) {
                return response()->json(['success' => false, 'message' => 'Unable to generate playback URL'], 500);
            }

            return response()->json([
                'success'    => true,
                'data'       => [
                    'stream_url' => $url,
                    'expires_in' => 3600,
                ],
                'stream_url' => $url,
                'expires_in' => 3600,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    private function findOwnWebinar(int $id): ?Webinar
    {
        $query = Webinar::query();

        if (!Auth::user()->isAdmin()) {
            $query->byInstructor(Auth::id());
        }

        return $query->find($id);
    }

    private function recordingAccessTableExists(): bool
    {
        return Schema::hasTable((new WebinarRecordingAccess())->getTable());
    }

    private function recordingAccessStatsForWebinar(Webinar $webinar): array
    {
        $defaults = [
            'total_requests'    => 0,
            'approved_requests' => 0,
            'pending_requests'  => 0,
            'total_downloads'   => 0,
        ];

        if (!$this->recordingAccessTableExists()) {
            return $defaults;
        }

        $requests = $webinar->recordingAccessRequests();

        return [
            'total_requests'    => $requests->count(),
            'approved_requests' => (clone $requests)->where('status', 'approved')->count(),
            'pending_requests'  => (clone $requests)->where('status', 'pending')->count(),
            'total_downloads'   => (int) (clone $requests)
                ->where('status', 'approved')
                ->sum('download_count'),
        ];
    }

    private function pendingRecordingRequestCountForInstructor(int $instructorId): int
    {
        if (!$this->recordingAccessTableExists()) {
            return 0;
        }

        return WebinarRecordingAccess::whereHas('webinar', fn ($q) => $q->where('instructor_id', $instructorId))
            ->where('status', 'pending')
            ->count();
    }

    private function uploadThumbnail($file): string
    {
        $filename = 'webinar_thumb_' . Str::random(16) . '.' . $file->getClientOriginalExtension();
        return MediaStorage::storeAs('webinar-thumbnails', $filename, $file);
    }

    private function uploadVideo($file): string
    {
        $filename = 'past_recording_' . Str::random(16) . '.' . $file->getClientOriginalExtension();
        return MediaStorage::storeAs('past-recordings', $filename, $file);
    }

    private function notFound(string $resource)
    {
        return response()->json(['success' => false, 'message' => "{$resource} not found"], 404);
    }

    private function validationError($validator)
    {
        $errors = $validator->errors();

        return response()->json([
            'success' => false,
            'message' => $errors->first() ?: 'Validation error',
            'errors'  => $errors,
        ], 422);
    }

    private function normalizeWebinarInput(Request $request): void
    {
        $merged = [];

        if ($request->has('time') && is_string($request->input('time'))) {
            $time = trim($request->input('time'));
            if (preg_match('/^(\d{1,2}):(\d{2})/', $time, $matches)) {
                $merged['time'] = sprintf('%02d:%s', (int) $matches[1], $matches[2]);
            }
        }

        foreach (['duration', 'max_attendees', 'price'] as $numericField) {
            if ($request->has($numericField) && $request->input($numericField) !== '') {
                $merged[$numericField] = $request->input($numericField);
            }
        }

        if (isset($merged['duration'])) {
            $merged['duration'] = (int) $merged['duration'];
        }
        if (isset($merged['max_attendees'])) {
            $merged['max_attendees'] = (int) $merged['max_attendees'];
        }

        if ($request->has('participant_type') && $request->input('participant_type') === '') {
            $merged['participant_type'] = 'my_learners';
        }

        if ($merged !== []) {
            $request->merge($merged);
        }
    }

    private function serverError(\Exception $e)
    {
        return response()->json(['success' => false, 'message' => 'Server error: ' . $e->getMessage()], 500);
    }

    private function notifyLearnerOfRejectedRegistration(
        Webinar $webinar,
        WebinarRegistration $registration,
        array $refundData,
    ): void {
        $learner = $registration->learner;
        if (!$learner) {
            return;
        }

        try {
            app(LearnerAnnouncementService::class)->notifyWebinarRegistrationRejected(
                $learner,
                $webinar,
                $registration,
                $refundData,
            );
        } catch (\Throwable $e) {
            Log::error('Failed to create webinar rejection in-app notification', [
                'registration_id' => $registration->id,
                'learner_id' => $registration->learner_id,
                'error' => $e->getMessage(),
            ]);
        }

        if (!$learner->email) {
            return;
        }

        try {
            Mail::to($learner->email)->send(
                new WebinarRegistrationRejectedMail($webinar, $registration, $refundData)
            );
        } catch (\Throwable $e) {
            Log::error('Failed to send webinar rejection email', [
                'registration_id' => $registration->id,
                'learner_id' => $registration->learner_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function registrationCanBeApproved(WebinarRegistration $registration): bool
    {
        return in_array($registration->status, ['registered', 'waitlisted'], true);
    }

    private function registrationCanBeRejected(WebinarRegistration $registration): bool
    {
        return $this->registrationCanBeApproved($registration);
    }
}