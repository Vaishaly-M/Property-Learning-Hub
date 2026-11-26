<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactWebinarRegistration;
use App\Models\User;
use App\Models\Webinar;
use App\Services\Crm\ClassificationWorkflowService;
use App\Services\Crm\ContactActivityService;
use App\Services\Crm\WebinarAutomationService;
use App\Services\Payments\StripeWebinarPaymentService;
use App\Services\Zoom\ZoomApiService;
use App\Exceptions\ZoomApiException;
use App\Support\LearnerNotificationDismissals;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class CrmWebinarController extends Controller
{
    private const VALID_STATUSES = ['upcoming', 'live', 'completed', 'cancelled'];
    private const VALID_CATEGORIES = ['market', 'investment', 'tax', 'legal', 'beginner'];
    private const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

    public function index(Request $request)
    {
        $query = Webinar::with(['instructor:id,first_name,last_name'])
            ->withCount(['registrations', 'approvedRegistrations']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('title', 'like', "%{$search}%");
        }

        $webinars = $query->orderByDesc('date')->paginate($request->get('per_page', 15));

        // Only count CRM registrations where contact exists
        $crmRegCounts = ContactWebinarRegistration::whereHas('contact') // Contact must exist
            ->selectRaw('webinar_id, count(*) as crm_count, sum(attended) as attended_count')
            ->groupBy('webinar_id')
            ->get()
            ->keyBy('webinar_id');

        return response()->json([
            'success'    => true,
            'data'       => $webinars->map(function ($w) use ($crmRegCounts) {
                $crm = $crmRegCounts->get($w->id);
                return [
                    'id'              => $w->id,
                    'title'           => $w->title,
                    'description'     => $w->description,
                    'date'            => $w->date,
                    'time'            => $w->time,
                    'duration'        => $w->duration,
                    'status'          => $w->status,
                    'live_link'       => $w->live_link,
                    'max_attendees'   => $w->max_attendees,
                    'price'           => (float) ($w->price ?? 0),
                    'presenter'       => $w->instructor ? [
                        'id'   => $w->instructor->id,
                        'name' => "{$w->instructor->first_name} {$w->instructor->last_name}",
                    ] : null,
                    'platform_registrations' => $w->registrations_count,
                    'crm_registrations'      => $crm?->crm_count ?? 0,
                    'crm_attended'           => $crm?->attended_count ?? 0,
                    // Zoom Webinar fields
                    'zoom_webinar_id'       => $w->zoom_webinar_id,
                    'zoom_join_url'         => $w->zoom_join_url,
                    'zoom_start_url'        => $w->zoom_start_url,
                    'zoom_uuid'             => $w->zoom_uuid,
                    'zoom_password'         => $w->zoom_password,
                    'zoom_registration_url' => $w->zoom_registration_url,
                ];
            }),
            'pagination' => [
                'current_page' => $webinars->currentPage(),
                'per_page'     => $webinars->perPage(),
                'total'        => $webinars->total(),
                'last_page'    => $webinars->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->merge($this->normalizeWebinarInput($request));

        $data = $request->validate([
            'title'         => 'required|string|max:255',
            'description'   => 'nullable|string',
            'date'          => 'required|date|after_or_equal:today',
            'time'          => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'duration'      => 'nullable|integer|min:15',
            'live_link'     => 'nullable|url',
            'max_attendees' => 'nullable|integer|min:1',
            'presenter_id'  => 'nullable|exists:users,id',
            'category'      => 'nullable|in:market,investment,tax,legal,beginner',
            'level'         => 'nullable|in:beginner,intermediate,advanced',
            'status'        => 'nullable|in:upcoming,live,completed,cancelled',
            'price'         => 'nullable|numeric|min:0',
        ]);

        $presenterId = $data['presenter_id'] ?? auth()->id();
        if (!$presenterId) {
            $presenterId = User::where('role', 'instructor')->value('id')
                ?? User::where('role', 'admin')->value('id');
        }

        // ---- Zoom session creation (Webinar → Meeting fallback) --------------
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

        $webinar = Webinar::create([
            'instructor_id'     => $presenterId,
            'title'             => $data['title'],
            'description'       => $data['description'] ?? null,
            'date'              => $data['date'],
            'time'              => $data['time'],
            'duration'          => $data['duration'] ?? 60,
            'live_link'         => $zoomWebinar['join_url'] ?? ($data['live_link'] ?? null),
            'max_attendees'     => $data['max_attendees'] ?? 100,
            'category'          => $data['category'] ?? 'beginner',
            'level'             => $data['level'] ?? 'beginner',
            'status'            => 'upcoming',
            'price'             => $data['price'] ?? 0,
            'participant_type'  => 'all_learners',
            // Zoom Webinar fields
            'zoom_webinar_id'       => isset($zoomWebinar['id']) ? (string) $zoomWebinar['id'] : null,
            'zoom_join_url'         => $zoomWebinar['join_url'] ?? null,
            'zoom_start_url'        => $zoomWebinar['start_url'] ?? null,
            'zoom_uuid'             => $zoomWebinar['uuid'] ?? null,
            'zoom_password'         => $zoomWebinar['password'] ?? null,
            'zoom_registration_url' => $zoomWebinar['registration_url'] ?? null,
        ]);

        Log::info('Zoom Webinar created', [
            'webinar_id'      => $webinar->id,
            'zoom_webinar_id' => $webinar->zoom_webinar_id,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $webinar,
            'message' => 'Webinar created successfully',
        ], 201);
    }

    public function show(Webinar $webinar)
    {
        $webinar->load(['instructor:id,first_name,last_name,email']);
        
        // Only get registrations where contact exists
        $crmRegistrations = ContactWebinarRegistration::whereHas('contact') // Contact must exist
            ->where('webinar_id', $webinar->id)
            ->with('contact')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'webinar' => array_merge($webinar->toArray(), [
                    // Ensure Zoom fields are always present even on older records
                    'zoom_webinar_id'       => $webinar->zoom_webinar_id,
                    'zoom_join_url'         => $webinar->zoom_join_url,
                    'zoom_start_url'        => $webinar->zoom_start_url,
                    'zoom_uuid'             => $webinar->zoom_uuid,
                    'zoom_password'         => $webinar->zoom_password,
                    'zoom_registration_url' => $webinar->zoom_registration_url,
                ]),
                'crm_registrations' => $crmRegistrations->map(fn ($r) => [
                    'id'            => $r->id,
                    'contact_id'    => $r->contact_id,
                    'contact_name'  => $r->contact?->full_name,
                    'contact_email' => $r->contact?->email,
                    'status'        => $r->status,
                    'attended'      => $r->attended,
                    'no_show'       => $r->no_show,
                    'registered_at' => $r->registered_at,
                ]),
            ],
        ]);
    }

    public function update(Request $request, Webinar $webinar)
    {
        $request->merge($this->normalizeWebinarInput($request));

        $data = $request->validate([
            'title'         => 'sometimes|string|max:255',
            'description'   => 'nullable|string',
            'date'          => 'sometimes|date',
            'time'          => ['sometimes', 'regex:/^\d{2}:\d{2}$/'],
            'duration'      => 'nullable|integer|min:15',
            'live_link'     => 'nullable|url',
            'max_attendees' => 'nullable|integer|min:1',
            'presenter_id'  => 'nullable|exists:users,id',
            'category'      => 'nullable|in:market,investment,tax,legal,beginner',
            'level'         => 'nullable|in:beginner,intermediate,advanced',
            'status'        => 'nullable|in:upcoming,live,completed,cancelled',
            'price'         => 'nullable|numeric|min:0',
        ]);

        if (isset($data['presenter_id'])) {
            $data['instructor_id'] = $data['presenter_id'];
            unset($data['presenter_id']);
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

        return response()->json([
            'success' => true,
            'data'    => $webinar->fresh(),
            'message' => 'Webinar updated successfully',
        ]);
    }

    private function normalizeWebinarInput(Request $request): array
    {
        $normalized = $request->all();

        if (isset($normalized['time']) && is_string($normalized['time'])) {
            $time = trim($normalized['time']);
            if (preg_match('/^(\d{1,2}):(\d{2})/', $time, $matches)) {
                $normalized['time'] = sprintf('%02d:%s', (int) $matches[1], $matches[2]);
            }
        }

        foreach (['status', 'category', 'level'] as $enumField) {
            if (!isset($normalized[$enumField]) || !is_string($normalized[$enumField])) {
                continue;
            }
            $normalized[$enumField] = strtolower(trim($normalized[$enumField]));
        }

        if (isset($normalized['status']) && !in_array($normalized['status'], self::VALID_STATUSES, true)) {
            unset($normalized['status']);
        }
        if (isset($normalized['category']) && !in_array($normalized['category'], self::VALID_CATEGORIES, true)) {
            unset($normalized['category']);
        }
        if (isset($normalized['level']) && !in_array($normalized['level'], self::VALID_LEVELS, true)) {
            unset($normalized['level']);
        }

        return $normalized;
    }

    public function registerContact(Request $request, Webinar $webinar)
    {
        // Verify webinar exists
        if (!$webinar->exists) {
            return response()->json([
                'success' => false,
                'message' => 'Webinar not found',
            ], 404);
        }

        if (in_array($webinar->status, ['cancelled', 'completed'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Registrations are closed for this webinar',
            ], 422);
        }

        $data = $request->validate([
            'contact_id' => 'required|exists:contacts,id',
        ]);

        // Verify contact exists
        $contact = Contact::where('id', $data['contact_id'])->first();
        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Contact not found',
            ], 404);
        }

        $registration = ContactWebinarRegistration::firstOrCreate(
            ['webinar_id' => $webinar->id, 'contact_id' => $contact->id],
            ['status' => 'registered', 'registered_at' => now()]
        );

        $existing = $contact->classifications()->pluck('classification')->toArray();
        if (!in_array('webinar_registrant', $existing)) {
            $existing[] = 'webinar_registrant';
            $contact->syncClassifications($existing);
        }

        ContactActivityService::log(
            $contact,
            'webinar_registered',
            "Registered for webinar: {$webinar->title}",
            null,
            ['webinar_id' => $webinar->id]
        );

        app(WebinarAutomationService::class)->sendRegistrationConfirmation($registration);
        app(ClassificationWorkflowService::class)->applyRules($contact, 'webinar_registered');

        return response()->json([
            'success' => true,
            'data'    => $registration,
            'message' => 'Contact registered for webinar',
        ], 201);
    }

    public function updateRegistration(Request $request, Webinar $webinar, ContactWebinarRegistration $registration)
    {
        abort_if($registration->webinar_id !== $webinar->id, 404);

        // Verify contact exists
        if (!$registration->contact()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Contact not found',
            ], 404);
        }

        $data = $request->validate([
            'attended' => 'sometimes|boolean',
            'no_show'  => 'sometimes|boolean',
            'status'   => 'sometimes|string',
        ]);

        $registration->update($data);
        $contact = $registration->contact;

        if (!empty($data['attended'])) {
            ContactActivityService::log($contact, 'webinar_attended', "Attended webinar: {$webinar->title}");
        } elseif (!empty($data['no_show'])) {
            ContactActivityService::log($contact, 'webinar_no_show', "No show: {$webinar->title}");
        }

        return response()->json([
            'success' => true,
            'data'    => $registration->fresh(),
            'message' => 'Registration updated',
        ]);
    }

    public function cancel(Webinar $webinar, StripeWebinarPaymentService $webinarPayments)
    {
        if (!in_array($webinar->status, ['upcoming', 'live'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Only upcoming or live webinars can be cancelled',
            ], 422);
        }

        // Only get registrations where contact exists
        $activeRegistrations = $webinar->registrations()
            ->whereHas('contact') // Contact must exist
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

        // Only update registrations where contact exists
        ContactWebinarRegistration::query()
            ->whereHas('contact') // Contact must exist
            ->where('webinar_id', $webinar->id)
            ->whereNotIn('status', ['cancelled'])
            ->update([
                'status' => 'cancelled',
            ]);

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
            'message' => 'Webinar cancelled. Active registrations were updated and paid registrations refunded where applicable.',
        ]);
    }

    public function destroy(Webinar $webinar)
    {
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

        return response()->json([
            'success' => true,
            'message' => 'Webinar deleted successfully',
        ]);
    }
}