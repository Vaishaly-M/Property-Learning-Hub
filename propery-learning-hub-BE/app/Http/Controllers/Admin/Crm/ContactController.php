<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Enums\CrmEnums;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Services\Crm\ContactActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContactController extends Controller
{
   public function index(Request $request)
    {
        $query = Contact::with(['classifications', 'memberships']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('classification') && $request->classification !== 'all') {
            $query->whereHas('classifications', fn ($q) => $q->where('classification', $request->classification));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%")
                    ->orWhere('contact_ref', 'like', "%{$search}%");
            });
        }

        $query->orderBy($request->get('sort_by', 'created_at'), $request->get('sort_order', 'desc'));
        $contacts = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success'    => true,
            'data'       => $contacts->map(fn ($c) => $this->formatContact($c)),
            'pagination' => $this->pagination($contacts),
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeContactInput($request);

        $data = $request->validate([
            'first_name'      => 'required|string|max:255',
            'last_name'       => 'required|string|max:255',
            'email'           => 'nullable|email|max:255',
            'phone_number'    => 'nullable|string|max:50',
            'notes'           => 'nullable|string',
            'classifications' => 'nullable|array',
            'classifications.*' => Rule::in(CrmEnums::CLASSIFICATIONS),
        ]);

        $contact = DB::transaction(function () use ($data) {
            $contact = Contact::create([
                'contact_ref'  => Contact::generateContactRef(),
                'first_name'   => $data['first_name'],
                'last_name'    => $data['last_name'],
                'email'        => $data['email'] ?? null,
                'phone_number' => $data['phone_number'] ?? null,
                'notes'        => $data['notes'] ?? null,
                'status'       => 'active',
                'created_by'   => auth()->id(),
            ]);

            if (! empty($data['classifications'])) {
                $contact->syncClassifications($data['classifications']);
                ContactActivityService::log(
                    $contact,
                    'classification_changed',
                    'Classifications assigned',
                    implode(', ', $data['classifications'])
                );
            }

            ContactActivityService::log($contact, 'contact_created', 'Contact created');

            return $contact;
        });

        $contact->load(['classifications', 'memberships']);

        return response()->json([
            'success' => true,
            'data'    => $this->formatContact($contact),
            'message' => 'Contact created successfully',
        ], 201);
    }

    public function show(Contact $contact)
    {
        $contact->load([
            'classifications',
            'memberships',
            'contactCourses.course',
            'webinarRegistrations.webinar',
            'eventRegistrations.event',
            'activities.performer',
            'user',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->formatContactDetail($contact),
        ]);
    }

    public function update(Request $request, Contact $contact)
    {
        $this->normalizeContactInput($request);

        $data = $request->validate([
            'first_name'      => 'sometimes|string|max:255',
            'last_name'       => 'sometimes|string|max:255',
            'email'           => 'nullable|email|max:255',
            'phone_number'    => 'nullable|string|max:50',
            'notes'           => 'nullable|string',
            'status'          => ['sometimes', Rule::in(CrmEnums::CONTACT_STATUSES)],
            'classifications' => 'nullable|array',
            'classifications.*' => Rule::in(CrmEnums::CLASSIFICATIONS),
        ]);

        $oldStatus = $contact->status;
        $contact->update(collect($data)->except('classifications')->toArray());

        if (array_key_exists('classifications', $data)) {
            $contact->syncClassifications($data['classifications'] ?? []);
            ContactActivityService::log(
                $contact,
                'classification_changed',
                'Classifications updated',
                implode(', ', $data['classifications'] ?? [])
            );
        }

        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            ContactActivityService::log(
                $contact,
                'status_changed',
                'Status changed',
                "From {$oldStatus} to {$data['status']}"
            );
        }

        if (isset($data['notes'])) {
            ContactActivityService::log($contact, 'note_added', 'Notes updated');
        }

        $contact->load(['classifications', 'memberships']);

        return response()->json([
            'success' => true,
            'data'    => $this->formatContact($contact),
            'message' => 'Contact updated successfully',
        ]);
    }

    public function destroy(Contact $contact)
    {
        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contact deleted successfully',
        ]);
    }

    public function activities(Contact $contact)
    {
        $activities = $contact->activities()->with('performer')->paginate(20);

        return response()->json([
            'success'    => true,
            'data'       => $activities->items(),
            'pagination' => $this->pagination($activities),
        ]);
    }

    public function addNote(Request $request, Contact $contact)
    {
        $data = $request->validate(['note' => 'required|string']);

        $contact->update([
            'notes' => trim(($contact->notes ? $contact->notes . "\n\n" : '') . $data['note']),
        ]);

        ContactActivityService::log($contact, 'note_added', 'Note added', $data['note']);

        return response()->json([
            'success' => true,
            'data'    => ['notes' => $contact->notes],
            'message' => 'Note added successfully',
        ]);
    }

    private function normalizeContactInput(Request $request): void
    {
        foreach (['email', 'phone_number', 'notes'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }
    }

    private function formatContact(Contact $contact): array
    {
        return [
            'id'              => $contact->id,
            'contact_ref'     => $contact->contact_ref,
            'first_name'      => $contact->first_name,
            'last_name'       => $contact->last_name,
            'full_name'       => $contact->full_name,
            'email'           => $contact->email,
            'phone_number'    => $contact->phone_number,
            'notes'           => $contact->notes,
            'status'          => $contact->status,
            'classifications' => $contact->classifications->pluck('classification'),
            'active_memberships' => $contact->memberships
                ->where('status', 'active')
                ->pluck('type')
                ->values(),
            'user_id'         => $contact->user_id,
            'created_at'      => $contact->created_at,
            'updated_at'      => $contact->updated_at,
        ];
    }

    private function formatContactDetail(Contact $contact): array
    {
        return array_merge($this->formatContact($contact), [
            'memberships' => $contact->memberships->map(fn ($m) => [
                'id'             => $m->id,
                'type'           => $m->type,
                'status'         => $m->status,
                'start_date'     => $m->start_date?->toDateString(),
                'renewal_date'   => $m->renewal_date?->toDateString(),
                'expiry_date'    => $m->expiry_date?->toDateString(),
                'payment_status' => $m->payment_status,
                'amount'         => $m->amount,
                'notes'          => $m->notes,
            ]),
            'courses' => $contact->contactCourses->map(fn ($cc) => [
                'id'                => $cc->id,
                'course_id'         => $cc->course_id,
                'course_title'      => $cc->course?->title,
                'purchase_date'     => $cc->purchase_date?->toDateString(),
                'completion_status' => $cc->completion_status,
                'certificate_issued' => $cc->certificate_issued,
                'amount_paid'       => $cc->amount_paid,
            ]),
            'webinar_registrations' => $contact->webinarRegistrations->map(fn ($r) => [
                'id'            => $r->id,
                'webinar_id'    => $r->webinar_id,
                'webinar_title' => $r->webinar?->title,
                'status'        => $r->status,
                'attended'      => $r->attended,
                'no_show'       => $r->no_show,
                'registered_at' => $r->registered_at,
            ]),
            'event_registrations' => $contact->eventRegistrations->map(fn ($r) => [
                'id'            => $r->id,
                'event_id'      => $r->crm_event_id,
                'event_title'   => $r->event?->title,
                'attended'      => $r->attended,
                'no_show'       => $r->no_show,
                'registered_at' => $r->registered_at,
            ]),
            'timeline' => $contact->activities->take(50)->map(fn ($a) => [
                'id'          => $a->id,
                'type'        => $a->activity_type,
                'title'       => $a->title,
                'description' => $a->description,
                'metadata'    => $a->metadata,
                'performed_by' => $a->performer
                    ? trim("{$a->performer->first_name} {$a->performer->last_name}")
                    : null,
                'created_at'  => $a->created_at,
            ]),
        ]);
    }

    private function pagination($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
            'last_page'    => $paginator->lastPage(),
        ];
    }
}
