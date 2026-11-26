<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Enums\CrmEnums;
use App\Http\Controllers\Controller;
use App\Models\Communication;
use App\Services\Crm\CrmCommunicationService;
use App\Services\Crm\LearnerAnnouncementService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommunicationController extends Controller
{
    public function __construct(
        private CrmCommunicationService $communicationService,
        private LearnerAnnouncementService $learnerAnnouncements,
    ) {}

   public function index(Request $request)
    {
        $query = Communication::with('creator:id,first_name,last_name');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        $communications = $query->orderByDesc('created_at')->paginate($request->get('per_page', 15));

        $items = collect($communications->items())->map(function ($comm) {
            $comm->read_count = $this->calculateReadCount($comm->id);
            return $comm;
        });

        return response()->json([
            'success'    => true,
            'data'       => $items,
            'pagination' => [
                'current_page' => $communications->currentPage(),
                'per_page'     => $communications->perPage(),
                'total'        => $communications->total(),
                'last_page'    => $communications->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeCommunicationInput($request);

        $data = $request->validate([
            'type'            => ['required', Rule::in(CrmEnums::COMMUNICATION_TYPES)],
            'subject'         => 'required|string|max:255',
            'body'            => 'required|string',
            'priority'        => ['nullable', Rule::in(CrmEnums::ANNOUNCEMENT_PRIORITIES)],
            'category'        => ['nullable', Rule::in(CrmEnums::ANNOUNCEMENT_CATEGORIES)],
            'audience_filter' => ['nullable', Rule::in(CrmEnums::COMMUNICATION_FILTERS)],
            'filter_params'   => 'nullable|array',
            'contact_ids'     => 'nullable|array',
            'contact_ids.*'   => 'exists:contacts,id',
            'scheduled_at'    => ['nullable', 'date', Rule::when(! $request->boolean('send_now'), 'after:now')],
            'send_now'        => 'nullable|boolean',
        ], [
            'scheduled_at.after' => 'Schedule date must be in the future.',
        ]);

        $communication = Communication::create([
            'type'            => $data['type'],
            'subject'         => $data['subject'],
            'body'            => $data['body'],
            'priority'        => $data['priority'] ?? 'medium',
            'category'        => $data['category'] ?? 'general',
            'audience_filter' => $data['audience_filter'] ?? 'custom',
            'filter_params'   => $data['filter_params'] ?? null,
            'status'          => ! empty($data['send_now']) ? 'sent' : (! empty($data['scheduled_at']) ? 'scheduled' : 'draft'),
            'scheduled_at'    => $data['scheduled_at'] ?? null,
            'sent_at'         => null,
            'created_by'      => auth()->id(),
        ]);

        $contactIds = $this->communicationService->resolveAudience(
            $communication->audience_filter,
            $data['filter_params'] ?? [],
            $data['contact_ids'] ?? null
        );

        $this->communicationService->attachRecipients($communication, $contactIds);

        if (! empty($data['send_now'])) {
            $sent = $this->communicationService->send($communication, $contactIds);
            $learnerCount = $this->learnerAnnouncements->publish($communication->fresh());

            return response()->json([
                'success' => true,
                'data'    => $communication->fresh()->load('recipients'),
                'message' => "Communication sent to {$sent} contacts"
                    . ($learnerCount > 0 ? " and {$learnerCount} learners" : ''),
            ], 201);
        }

        return response()->json([
            'success' => true,
            'data'    => $communication->fresh()->load('recipients'),
            'message' => 'Communication saved',
        ], 201);
    }

    public function update(Request $request, Communication $communication)
    {
        if (in_array($communication->status, ['sent', 'cancelled'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot edit sent or cancelled communication',
            ], 422);
        }

        $this->normalizeCommunicationInput($request);

        $data = $request->validate([
            'type'            => ['sometimes', Rule::in(CrmEnums::COMMUNICATION_TYPES)],
            'subject'         => 'sometimes|string|max:255',
            'body'            => 'sometimes|string',
            'priority'        => ['sometimes', Rule::in(CrmEnums::ANNOUNCEMENT_PRIORITIES)],
            'category'        => ['sometimes', Rule::in(CrmEnums::ANNOUNCEMENT_CATEGORIES)],
            'audience_filter' => ['sometimes', Rule::in(CrmEnums::COMMUNICATION_FILTERS)],
            'filter_params'   => 'nullable|array',
            'contact_ids'     => 'nullable|array',
            'contact_ids.*'   => 'exists:contacts,id',
            'scheduled_at'    => ['nullable', 'date', Rule::when($request->filled('scheduled_at'), 'after:now')],
        ], [
            'scheduled_at.after' => 'Schedule date must be in the future.',
        ]);

        $updates = collect($data)->only(['type', 'subject', 'body', 'priority', 'category', 'audience_filter', 'filter_params', 'scheduled_at'])->toArray();

        if (array_key_exists('scheduled_at', $data)) {
            $updates['status'] = $data['scheduled_at'] ? 'scheduled' : 'draft';
        }

        $communication->update($updates);

        if (isset($data['audience_filter']) || isset($data['filter_params']) || isset($data['contact_ids'])) {
            $communication->recipients()->delete();
            $contactIds = $this->communicationService->resolveAudience(
                $communication->audience_filter,
                $communication->filter_params ?? [],
                $data['contact_ids'] ?? null
            );
            $this->communicationService->attachRecipients($communication, $contactIds);
        }

        return response()->json([
            'success' => true,
            'data'    => $communication->fresh()->load('recipients'),
            'message' => 'Communication updated',
        ]);
    }

    public function show(Communication $communication)
    {
        $communication->load(['creator:id,first_name,last_name', 'recipients' => function ($query) {
            $query->whereHas('contact') // Only show recipients where contact exists
                ->with('contact:id,first_name,last_name,email');
        }]);
        $communication->read_count = $this->calculateReadCount($communication->id);

        return response()->json(['success' => true, 'data' => $communication]);
    }


    private function calculateReadCount(int $communicationId): int
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('notifications')) {
            return 0;
        }

        return \Illuminate\Support\Facades\DB::table('notifications')
            ->where('type', 'learner_announcement')
            ->whereNotNull('read_at')
            ->where('data', 'like', '%"communication_id":' . $communicationId . '%')
            ->count();
    }

    public function send(Communication $communication)
    {
        if ($communication->status === 'sent') {
            return response()->json(['success' => false, 'message' => 'Already sent'], 422);
        }

        if ($communication->status === 'cancelled') {
            return response()->json(['success' => false, 'message' => 'Cannot send a cancelled communication'], 422);
        }

        $contactIds = $communication->recipients()->pluck('contact_id')->toArray();

        if (empty($contactIds)) {
            $contactIds = $this->communicationService->resolveAudience(
                $communication->audience_filter,
                $communication->filter_params ?? []
            );
            $this->communicationService->attachRecipients($communication, $contactIds);
        }

        $sent = $this->communicationService->send($communication, $contactIds);
        $learnerCount = $this->learnerAnnouncements->publish($communication->fresh());

        return response()->json([
            'success' => true,
            'data'    => $communication->fresh(),
            'message' => "Communication sent to {$sent} contacts"
                . ($learnerCount > 0 ? " and {$learnerCount} learners" : ''),
        ]);
    }

    public function cancel(Communication $communication)
    {
        if ($communication->status === 'sent') {
            return response()->json([
                'success' => false,
                'message' => 'Sent communications cannot be cancelled',
            ], 422);
        }

        if ($communication->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Communication is already cancelled',
            ], 422);
        }

        $communication->update([
            'status'       => 'cancelled',
            'scheduled_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $communication->fresh()->load('recipients'),
            'message' => 'Communication cancelled',
        ]);
    }

    public function destroy(Communication $communication)
    {
        $communication->delete();

        return response()->json(['success' => true, 'message' => 'Communication deleted']);
    }

    public function options()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'types'       => CrmEnums::COMMUNICATION_TYPES,
                'filters'     => CrmEnums::COMMUNICATION_FILTERS,
                'statuses'    => CrmEnums::COMMUNICATION_STATUSES,
                'priorities'  => CrmEnums::ANNOUNCEMENT_PRIORITIES,
                'categories'  => CrmEnums::ANNOUNCEMENT_CATEGORIES,
            ],
        ]);
    }

    private function normalizeCommunicationInput(Request $request): void
    {
        if ($request->has('scheduled_at') && $request->input('scheduled_at') === '') {
            $request->merge(['scheduled_at' => null]);
        }
    }
}
