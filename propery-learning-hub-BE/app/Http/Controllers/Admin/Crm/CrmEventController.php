<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Enums\CrmEnums;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\CrmEvent;
use App\Models\CrmEventRegistration;
use App\Services\Crm\ContactActivityService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmEventController extends Controller
{
     public function index(Request $request)
    {
        $query = CrmEvent::with(['presenter:id,first_name,last_name'])
            ->withCount(['registrations']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $events = $query->orderByDesc('starts_at')->paginate($request->get('per_page', 15));

        return response()->json([
            'success'    => true,
            'data'       => $events->map(fn ($e) => $this->formatEvent($e)),
            'pagination' => [
                'current_page' => $events->currentPage(),
                'per_page'     => $events->perPage(),
                'total'        => $events->total(),
                'last_page'    => $events->lastPage(),
            ],
        ]);
    }
     public function show(CrmEvent $event)
    {
        $event->load(['presenter:id,first_name,last_name', 'registrations' => function ($query) {
            $query->whereHas('contact') // Only show registrations where contact exists
                ->with('contact');
        }]);

        return response()->json([
            'success' => true,
            'data'    => array_merge($this->formatEvent($event), [
                'registrations' => $event->registrations->map(fn ($r) => [
                    'id'            => $r->id,
                    'contact_id'    => $r->contact_id,
                    'contact_name'  => $r->contact?->full_name,
                    'contact_email' => $r->contact?->email,
                    'attended'      => $r->attended,
                    'no_show'       => $r->no_show,
                    'registered_at' => $r->registered_at,
                ]),
            ]),
        ]);
    }

    public function update(Request $request, CrmEvent $event)
    {
        $this->normalizeEventInput($request);

        $data = $request->validate([
            'title'        => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'venue'        => 'nullable|string|max:255',
            'online_link'  => 'nullable|url|max:2048',
            'capacity'     => 'nullable|integer|min:1',
            'starts_at'    => 'sometimes|date',
            'ends_at'      => 'nullable|date',
            'presenter_id' => 'nullable|exists:users,id',
            'status'       => ['sometimes', Rule::in(CrmEnums::EVENT_STATUSES)],
        ], [
            'online_link.url' => 'Please enter a valid online meeting link.',
        ]);

        $startsAt = $data['starts_at'] ?? $event->starts_at;
        if (! empty($data['ends_at']) && $startsAt && strtotime($data['ends_at']) <= strtotime((string) $startsAt)) {
            return response()->json([
                'success' => false,
                'message' => 'The end date must be after the start date.',
                'errors'  => ['ends_at' => ['The end date must be after the start date.']],
            ], 422);
        }

        $event->update($data);

        return response()->json([
            'success' => true,
            'data'    => $this->formatEvent($event->fresh()->load('presenter')),
            'message' => 'Event updated successfully',
        ]);
    }

    public function destroy(CrmEvent $event)
    {
        $event->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event deleted successfully',
        ]);
    }

     public function registerContact(Request $request, CrmEvent $event)
    {
        // Verify event exists
        if (!$event->exists) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
            ], 404);
        }

        $data = $request->validate(['contact_id' => 'required|exists:contacts,id']);
        
        // Verify contact exists
        $contact = Contact::where('id', $data['contact_id'])->first();
        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Contact not found',
            ], 404);
        }

        if ($event->capacity && $event->registrations()->count() >= $event->capacity) {
            return response()->json([
                'success' => false,
                'message' => 'Event is at full capacity',
            ], 422);
        }

        if (in_array($event->status, ['cancelled', 'completed'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Registrations are closed for this event',
            ], 422);
        }

        $registration = CrmEventRegistration::firstOrCreate(
            ['crm_event_id' => $event->id, 'contact_id' => $contact->id],
            ['registered_at' => now()]
        );

        $existing = $contact->classifications()->pluck('classification')->toArray();
        if (!in_array('event_registrant', $existing)) {
            $existing[] = 'event_registrant';
            $contact->syncClassifications($existing);
        }

        ContactActivityService::log(
            $contact,
            'event_registered',
            "Registered for event: {$event->title}",
            null,
            ['event_id' => $event->id]
        );

        return response()->json([
            'success' => true,
            'data'    => $registration,
            'message' => 'Contact registered for event',
        ], 201);
    }

      public function updateRegistration(Request $request, CrmEvent $event, CrmEventRegistration $registration)
    {
        abort_if($registration->crm_event_id !== $event->id, 404);

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
        ]);

        $registration->update($data);
        $contact = $registration->contact;

        if (!empty($data['attended'])) {
            ContactActivityService::log($contact, 'event_attended', "Attended event: {$event->title}");
        }

        return response()->json([
            'success' => true,
            'data'    => $registration->fresh(),
            'message' => 'Registration updated',
        ]);
    }
    public function store(Request $request)
    {
        $this->normalizeEventInput($request);

        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'venue'        => 'nullable|string|max:255',
            'online_link'  => 'nullable|url|max:2048',
            'capacity'     => 'nullable|integer|min:1',
            'starts_at'    => 'required|date',
            'ends_at'      => 'nullable|date|after:starts_at',
            'presenter_id' => 'nullable|exists:users,id',
            'status'       => ['nullable', Rule::in(CrmEnums::EVENT_STATUSES)],
        ], [
            'ends_at.after' => 'The end date must be after the start date.',
            'online_link.url' => 'Please enter a valid online meeting link.',
        ]);

        $event = CrmEvent::create([
            ...$data,
            'status'     => $data['status'] ?? 'draft',
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->formatEvent($event->load('presenter')),
            'message' => 'Event created successfully',
        ], 201);
    }

    private function normalizeEventInput(Request $request): void
    {
        foreach (['description', 'venue', 'online_link', 'ends_at'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        if ($request->has('presenter_id') && $request->input('presenter_id') === '') {
            $request->merge(['presenter_id' => null]);
        }
    }

    private function formatEvent(CrmEvent $event): array
    {
        return [
            'id'                  => $event->id,
            'title'               => $event->title,
            'description'         => $event->description,
            'venue'               => $event->venue,
            'online_link'         => $event->online_link,
            'capacity'            => $event->capacity,
            'starts_at'           => $event->starts_at,
            'ends_at'             => $event->ends_at,
            'status'              => $event->status,
            'presenter'           => $event->presenter ? [
                'id'   => $event->presenter->id,
                'name' => "{$event->presenter->first_name} {$event->presenter->last_name}",
            ] : null,
            'registration_count'  => $event->registrations_count ?? $event->registrations()->count(),
            'attendance_count'    => $event->registrations()->where('attended', true)->count(),
        ];
    }
}
