<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\Webinar;
use App\Models\WebinarRegistration;
use App\Models\WebinarRecordingAccess;
use App\Services\Payments\StripeWebinarPaymentService;
use App\Support\LearnerNotificationDismissals;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;

class WebinarController extends Controller
{
    public function __construct(
        private readonly StripeWebinarPaymentService $webinarPayments,
    ) {}

    // -----------------------------------------------------------------------
    // BROWSE WEBINARS
    // -----------------------------------------------------------------------

    /**
     * List webinars browsable by the learner.
     * Respects participant_type so learners only see webinars they're allowed to register for.
     */
    public function index(Request $request)
    {
        try {
            $learnerId = Auth::id();

            // Build base query — only active statuses visible to learners
            $query = Webinar::whereIn('status', ['upcoming', 'live', 'completed'])
                ->with(['learningObjectives', 'tags', 'instructor:id,first_name,last_name'])
                ->withCount([
                    'registrations as total_registrations' => function ($registrationQuery) {
                        $registrationQuery->whereIn('status', ['registered', 'approved', 'waitlisted']);
                    },
                ])
                ->orderBy('date', 'asc');

            // Authenticated learners can browse academy webinars. "My Learners Only"
            // means platform learners, not only learners enrolled in a specific course.
            $query->visibleToLearners();

            // Filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('category')) {
                $query->where('category', $request->category);
            }
            if ($request->filled('level')) {
                $query->where('level', $request->level);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            if ($request->filled('price_type')) {
                if ($request->price_type === 'free') {
                    $query->where('price', 0);
                } elseif ($request->price_type === 'paid') {
                    $query->where('price', '>', 0);
                }
            }

            $perPage  = $request->get('per_page', 12);
            $webinars = $query->paginate($perPage);

            // Attach this learner's registration status to each webinar
            $webinarIds    = $webinars->pluck('id');
            $registrations = WebinarRegistration::where('learner_id', $learnerId)
                ->whereIn('webinar_id', $webinarIds)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->get()
                ->unique('webinar_id')
                ->keyBy('webinar_id');

            $recordingAccesses = WebinarRecordingAccess::where('learner_id', $learnerId)
                ->whereIn('webinar_id', $webinarIds)
                ->get()
                ->keyBy('webinar_id');

            $webinars->getCollection()->transform(function ($webinar) use ($registrations, $recordingAccesses) {
                $registration = $registrations->get($webinar->id);
                $access = $recordingAccesses->get($webinar->id);
                return $this->serializeWebinarForLearner(
                    $webinar,
                    $registration?->status,
                    $access,
                    $registration
                );
            });

            return response()->json(['success' => true, 'data' => $webinars]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Show full details of a single webinar.
     */
    public function show($id)
    {
        try {
            $webinar = Webinar::whereIn('status', ['upcoming', 'live', 'completed'])
                ->visibleToLearners()
                ->with(['learningObjectives', 'tags', 'instructor:id,first_name,last_name'])
                ->withCount([
                    'registrations as total_registrations' => function ($registrationQuery) {
                        $registrationQuery->whereIn('status', ['registered', 'approved', 'waitlisted']);
                    },
                ])
                ->find($id);

            if (!$webinar) {
                return $this->notFound('Webinar');
            }

            $learnerId = Auth::id();

            $myRegistration = WebinarRegistration::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->first();

            $myRecordingAccess = WebinarRecordingAccess::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            $data = $this->serializeWebinarForLearner(
                $webinar,
                $myRegistration?->status,
                $myRecordingAccess,
                $myRegistration
            );

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // REGISTRATION
    // -----------------------------------------------------------------------

    /**
     * Create a Stripe payment intent for a paid webinar registration.
     */
    public function createRegistrationPaymentIntent($id)
    {
        try {
            $webinar = Webinar::where('status', 'upcoming')
                ->visibleToLearners()
                ->find($id);
            if (!$webinar) {
                return $this->notFound('Upcoming webinar');
            }

            if ((float) $webinar->price <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'This webinar is free and does not require payment.',
                ], 422);
            }

            if (!config('services.stripe.secret') || !config('services.stripe.key')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Online payments are not configured. Please contact support.',
                ], 503);
            }

            $learnerId = Auth::id();

            if ($webinar->isFull()) {
                return response()->json(['success' => false, 'message' => 'This webinar is at full capacity'], 422);
            }

            $existing = WebinarRegistration::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->whereNotIn('status', ['cancelled', 'rejected'])
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already registered for this webinar (status: ' . $existing->status . ')',
                ], 422);
            }

            $result = $this->webinarPayments->createPaymentIntent($webinar, Auth::user());

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Register for a webinar.
     */
    public function register(Request $request, $id)
    {
        try {
            $webinar = Webinar::where('status', 'upcoming')
                ->visibleToLearners()
                ->find($id);
            if (!$webinar) {
                return $this->notFound('Upcoming webinar');
            }

            $learnerId = Auth::id();
            $isPaidWebinar = (float) $webinar->price > 0;

            if ($isPaidWebinar) {
                $request->validate([
                    'payment_intent_id' => 'required|string',
                ]);
            }

            // Check capacity
            if ($webinar->isFull()) {
                return response()->json(['success' => false, 'message' => 'This webinar is at full capacity'], 422);
            }

            $existing = WebinarRegistration::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->whereNotIn('status', ['cancelled', 'rejected'])
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already registered for this webinar (status: ' . $existing->status . ')',
                ], 422);
            }

            $paymentReference = null;
            $paymentStatus = 'free';
            $amountPaid = '0.00';

            if ($isPaidWebinar) {
                $payment = $this->webinarPayments->verifyWebinarPayment(
                    $request->string('payment_intent_id')->toString(),
                    $webinar,
                    $learnerId,
                );

                $paymentReference = $payment->stripe_payment_intent_id;
                $paymentStatus = 'paid';
                $amountPaid = number_format(((float) $webinar->price), 2, '.', '');
            }

            $registration = $this->upsertLearnerRegistration(
                $webinar,
                $learnerId,
                $paymentStatus,
                $paymentReference,
                $amountPaid
            );

            LearnerNotificationDismissals::clearDashboardCache($learnerId);

            return response()->json([
                'success' => true,
                'data'    => $registration,
                'message' => $isPaidWebinar
                    ? 'Payment received and registration submitted. Awaiting instructor approval.'
                    : 'Registration submitted. Awaiting instructor approval.',
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

    /**
     * Cancel own registration.
     */
    public function cancelRegistration($id)
    {
        try {
            $registration = WebinarRegistration::where('webinar_id', $id)
                ->where('learner_id', Auth::id())
                ->first();

            if (!$registration) {
                return $this->notFound('Registration');
            }

            if (in_array($registration->status, ['cancelled', 'rejected'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration is already ' . $registration->status,
                ], 422);
            }

            $webinar = Webinar::find($id);
            if ($webinar && $webinar->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel a registration for a completed webinar',
                ], 422);
            }

            if ($webinar && $webinar->status === 'live') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel during a live webinar. Please contact support if you need assistance.',
                ], 422);
            }

            $refundData = ['refunded' => false];
            $isPaidRegistration = $registration->payment_status === 'paid'
                && !empty($registration->payment_reference);

            if ($isPaidRegistration) {
                $refundData = $this->webinarPayments->refundRegistration($registration);
            }

            $cancelPayload = [
                'status'            => 'cancelled',
                'payment_status'    => !empty($refundData['refunded']) ? 'refunded' : $registration->payment_status,
                'approved_at'       => null,
                'rejected_at'       => null,
                'rejection_reason'  => null,
                'attended'          => false,
                'joined_at'         => null,
                'left_at'           => null,
            ];

            if (Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
                $cancelPayload['manual_attendance'] = false;
            }

            $registration->update($cancelPayload);

            LearnerNotificationDismissals::clearDashboardCache((int) Auth::id());

            $message = !empty($refundData['refunded'])
                ? 'Registration cancelled. A refund of '
                    . ($refundData['formatted_amount'] ?? $refundData['refund_amount'])
                    . ' has been initiated to your original payment method.'
                : 'Registration cancelled';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data'    => $refundData,
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

    /**
     * Record that the learner joined the live session (Google Meet, Zoom, etc.).
     */
    public function joinLive($id)
    {
        try {
            $webinar = Webinar::whereIn('status', ['upcoming', 'live'])
                ->visibleToLearners()
                ->find($id);

            if (!$webinar) {
                return $this->notFound('Live webinar');
            }

            if (!$webinar->hasLearnerJoinOpened()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Join opens 15 minutes before the scheduled start, or once the instructor starts the webinar.',
                ], 422);
            }

            $registration = WebinarRegistration::where('webinar_id', $id)
                ->where('learner_id', Auth::id())
                ->where('status', 'approved')
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only approved registrations can join this webinar',
                ], 422);
            }

            if (!$webinar->live_link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No live meeting link is configured for this webinar',
                ], 422);
            }

            if (!$registration->attended) {
                $joinPayload = [
                    'attended'  => true,
                    'joined_at' => $registration->joined_at ?? now(),
                    'left_at'   => null,
                ];

                if (Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
                    $joinPayload['manual_attendance'] = false;
                }

                $registration->update($joinPayload);
            }

            if ($webinar->status === 'upcoming') {
                $webinar->update([
                    'status'     => 'live',
                    'started_at' => $webinar->started_at ?? now(),
                ]);
            }

            $webinar = $webinar->fresh()->syncAttendanceMetrics();

            return response()->json([
                'success' => true,
                'data'    => [
                    'live_link' => $webinar->live_link,
                    'attended'  => true,
                ],
                'message' => 'Attendance recorded',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Get learner's own registrations (with webinar details).
     */
    public function myRegistrations(Request $request)
    {
        try {
            $query = WebinarRegistration::where('learner_id', Auth::id())
                ->with([
                    'webinar:id,title,date,time,duration,status,category,level,price,instructor_id,thumbnail,live_link',
                    'webinar.instructor:id,first_name,last_name',
                ])
                ->orderBy('created_at', 'desc');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $registrations = $query->paginate($request->get('per_page', 10));

            // Append thumbnail URLs
            $registrations->getCollection()->transform(function ($reg) {
                if ($reg->webinar && $reg->webinar->thumbnail) {
                    $reg->webinar->thumbnail_url = MediaUrl::url($reg->webinar->thumbnail);
                }
                return $reg;
            });

            return response()->json(['success' => true, 'data' => $registrations]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // RECORDING ACCESS
    // -----------------------------------------------------------------------

    /**
     * Request access to a webinar recording.
     */
    public function requestRecordingAccess(Request $request, $id)
    {
        try {
            $webinar = Webinar::where('status', 'completed')->find($id);
            if (!$webinar) {
                return $this->notFound('Completed webinar');
            }

            if (!$webinar->hasRecording()) {
                return response()->json(['success' => false, 'message' => 'No recording available for this webinar'], 422);
            }

            $learnerId = Auth::id();

            $existing = WebinarRecordingAccess::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            if ($existing) {
                if ($existing->status === 'approved' && $existing->isActive()) {
                    return response()->json(['success' => false, 'message' => 'You already have access to this recording'], 422);
                }
                if ($existing->status === 'pending') {
                    return response()->json(['success' => false, 'message' => 'Your request is already pending review'], 422);
                }
                // Re-request if rejected/revoked/expired
                $existing->update([
                    'status'           => 'pending',
                    'request_message'  => $request->message,
                    'approved_at'      => null,
                    'rejected_at'      => null,
                    'rejection_reason' => null,
                    'expires_at'       => null,
                ]);
                return response()->json([
                    'success' => true,
                    'data'    => $existing->fresh(),
                    'message' => 'Recording access re-requested',
                ]);
            }

            $access = WebinarRecordingAccess::create([
                'webinar_id'      => $id,
                'learner_id'      => $learnerId,
                'status'          => 'pending',
                'request_message' => $request->message,
                'download_count'  => 0,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $access,
                'message' => 'Recording access requested. Awaiting instructor approval.',
            ], 201);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Return a download URL for the webinar recording (JSON only).
     */
    public function downloadRecording($id)
    {
        try {
            $learnerId = Auth::id();

            $access = WebinarRecordingAccess::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            if (!$access || !$access->isActive()) {
                return response()->json(['success' => false, 'message' => 'You do not have approved access to this recording'], 403);
            }

            $webinar = Webinar::find($id);
            if (!$webinar || !$webinar->recording_path) {
                return $this->notFound('Recording');
            }

            $private = MediaStorage::isPrivatePath($webinar->recording_path);
            $path = MediaStorage::normalizePath($webinar->recording_path);

            if (!$path || !MediaStorage::exists($path, $private)) {
                return response()->json(['success' => false, 'message' => 'Recording file not found on server'], 404);
            }

            $name = $webinar->recording_original_name ?? 'recording.mp4';
            $safeName = str_replace('"', '\\"', $name);
            $usesCloud = $private
                ? MediaStorage::privateUsesCloud()
                : MediaStorage::usesCloud();

            if ($usesCloud) {
                $signedUrl = MediaStorage::temporaryUrl(
                    $path,
                    now()->addHours(2),
                    $private,
                    ['ResponseContentDisposition' => "attachment; filename=\"{$safeName}\""]
                );

                $access->update(['last_accessed_at' => now()]);
                $this->recordRecordingDownload($access);

                return response()->json([
                    'success' => true,
                    'data'    => [
                        'download_url' => $signedUrl,
                        'file_name'    => $name,
                    ],
                ]);
            }

            $downloadUrl = URL::temporarySignedRoute(
                'api.learner.webinars.recording.file',
                now()->addHours(2),
                ['id' => $id, 'access' => $access->id]
            );

            return response()->json([
                'success' => true,
                'data'    => [
                    'download_url' => $downloadUrl,
                    'file_name'    => $name,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Stream or redirect to a recording file via a short-lived signed URL.
     * Download counts are incremented here when the file is actually delivered.
     */
    public function streamRecordingFile(Request $request, $id)
    {
        try {
            if (!$request->hasValidSignature()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired download link',
                ], 403);
            }

            $access = WebinarRecordingAccess::where('id', $request->query('access'))
                ->where('webinar_id', $id)
                ->first();

            if (!$access || !$access->isActive()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have approved access to this recording',
                ], 403);
            }

            $webinar = Webinar::find($id);
            if (!$webinar || !$webinar->recording_path) {
                return $this->notFound('Recording');
            }

            $private = MediaStorage::isPrivatePath($webinar->recording_path);
            $path = MediaStorage::normalizePath($webinar->recording_path);

            if (!$path || !MediaStorage::exists($path, $private)) {
                return response()->json(['success' => false, 'message' => 'Recording file not found on server'], 404);
            }

            $this->recordRecordingDownload($access);

            $name = $webinar->recording_original_name ?? 'recording.mp4';
            $safeName = str_replace('"', '\\"', $name);
            $usesCloud = $private
                ? MediaStorage::privateUsesCloud()
                : MediaStorage::usesCloud();

            if ($usesCloud) {
                $signedUrl = MediaStorage::temporaryUrl(
                    $path,
                    now()->addHours(2),
                    $private,
                    ['ResponseContentDisposition' => "attachment; filename=\"{$safeName}\""]
                );

                return redirect()->away($signedUrl);
            }

            return MediaStorage::download($path, $name, null, $private);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * @deprecated Download counts are recorded when the signed file URL is used.
     */
    public function completeRecordingDownload($id)
    {
        try {
            $learnerId = Auth::id();

            $access = WebinarRecordingAccess::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            if (!$access || !$access->isActive()) {
                return response()->json(['success' => false, 'message' => 'You do not have approved access to this recording'], 403);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'download_count' => $access->download_count,
                ],
                'message' => 'Download already tracked when the file is delivered',
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Get a temporary signed stream URL for in-browser playback.
     */
    public function streamRecording($id)
    {
        try {
            $learnerId = Auth::id();

            $access = WebinarRecordingAccess::where('webinar_id', $id)
                ->where('learner_id', $learnerId)
                ->first();

            if (!$access || !$access->isActive()) {
                return response()->json(['success' => false, 'message' => 'You do not have approved access to this recording'], 403);
            }

            $webinar = Webinar::find($id);
            if (!$webinar || !$webinar->recording_path) {
                return $this->notFound('Recording');
            }

            $private = MediaStorage::isPrivatePath($webinar->recording_path);
            $path = MediaStorage::normalizePath($webinar->recording_path);

            if (!$path || !MediaStorage::exists($path, $private)) {
                return response()->json(['success' => false, 'message' => 'Recording file not found on server'], 404);
            }

            $url = MediaUrl::playbackUrl($path, $private);
            if (!$url) {
                return response()->json(['success' => false, 'message' => 'Unable to generate playback URL'], 500);
            }

            $access->update(['last_accessed_at' => now()]);

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

    /**
     * Check the learner's recording access status.
     */
    public function myRecordingAccess($id)
    {
        try {
            $access = WebinarRecordingAccess::where('webinar_id', $id)
                ->where('learner_id', Auth::id())
                ->first();

            return response()->json(['success' => true, 'data' => $access]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // -----------------------------------------------------------------------
    // HELPERS
    // -----------------------------------------------------------------------

    private function upsertLearnerRegistration(
        Webinar $webinar,
        int $learnerId,
        string $paymentStatus,
        ?string $paymentReference,
        string $amountPaid
    ): WebinarRegistration {
        $payload = [
            'status'            => 'registered',
            'attended'          => false,
            'watch_time'        => null,
            'payment_status'    => $paymentStatus,
            'payment_reference' => $paymentReference,
            'amount_paid'       => $amountPaid,
            'approved_at'       => null,
            'rejected_at'       => null,
            'rejection_reason'  => null,
            'joined_at'         => null,
            'left_at'           => null,
        ];

        if (Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
            $payload['manual_attendance'] = false;
        }

        return WebinarRegistration::updateOrCreate(
            [
                'webinar_id' => $webinar->id,
                'learner_id' => $learnerId,
            ],
            $payload
        )->fresh();
    }

    /**
     * @param  WebinarRegistration|string|null  $registration
     */
    private function serializeWebinarForLearner(
        Webinar $webinar,
        $registration = null,
        ?WebinarRecordingAccess $recordingAccess = null,
        ?WebinarRegistration $registrationModel = null
    ): array {
        $data = $webinar->toArray();
        $hasActiveAccess = $recordingAccess && $recordingAccess->isActive();

        if (!$hasActiveAccess) {
            unset(
                $data['recording_path'],
                $data['recording_url'],
                $data['recording_original_name'],
                $data['recording_size'],
                $data['recording_mime_type']
            );
        }

        if ($registrationModel) {
            $data['my_registration'] = $registrationModel;
            $data['my_registration_status'] = $registrationModel->status;
        } elseif ($registration !== null) {
            $data['my_registration_status'] = $registration;
        }

        $data['my_recording_access'] = $recordingAccess
            ? array_merge($recordingAccess->toArray(), ['is_active' => $recordingAccess->isActive()])
            : null;
        $data['is_full']             = $webinar->isFull();
        $data['has_recording']       = $webinar->hasRecording();
        $data['can_join_live']       = $registrationModel?->status === 'approved'
            && !empty($webinar->live_link)
            && $webinar->hasLearnerJoinOpened();

        return $data;
    }

    private function recordRecordingDownload(WebinarRecordingAccess $access): void
    {
        $cacheKey = "webinar_recording_download_counted:{$access->id}";

        if (Cache::add($cacheKey, true, now()->addMinutes(2))) {
            $access->increment('download_count');
        }

        $access->update(['last_accessed_at' => now()]);
    }

    private function notFound(string $resource)
    {
        return response()->json(['success' => false, 'message' => "{$resource} not found"], 404);
    }

    private function serverError(\Exception $e)
    {
        return response()->json(['success' => false, 'message' => 'Server error: ' . $e->getMessage()], 500);
    }
}