<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactClassificationHistory;
use App\Services\ContactActivityService;
use App\Services\ContactImportService;
use App\Services\DynamicFieldService;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    use ApiResponses;

    public function __construct(
        private DynamicFieldService $dynamicFieldService,
        private ContactImportService $contactImportService,
        private ContactActivityService $contactActivityService
    ) {}

    public function index(Request $request)
    {
        $query = Contact::query()->latest();

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('classification')) {
            $query->where('classification', $request->get('classification'));
        }

        $contacts = $query->paginate((int) $request->get('per_page', 20));
        $contacts->getCollection()->transform(function (Contact $contact) {
            return [
                ...$contact->toArray(),
                'custom_fields' => $this->dynamicFieldService->getValuesMap('contacts', $contact->id),
            ];
        });

        return $this->success($contacts);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'source' => 'nullable|string|max:100',
            'classification' => 'nullable|string|max:100',
            'membership_status' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'custom_fields' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $contact = Contact::create([
            ...$request->only([
                'first_name',
                'last_name',
                'email',
                'phone',
                'company',
                'source',
                'classification',
                'membership_status',
                'status',
                'notes',
            ]),
            'classification' => $request->get('classification', 'enquiries'),
            'membership_status' => $request->get('membership_status', 'none'),
            'status' => $request->get('status', 'active'),
            'created_by' => $request->user()?->id,
        ]);

        $this->dynamicFieldService->saveValues('contacts', $contact->id, $request->input('custom_fields', []));

        ContactClassificationHistory::create([
            'contact_id' => $contact->id,
            'previous_classification' => null,
            'new_classification' => $contact->classification,
            'changed_by' => $request->user()?->id,
            'change_date' => now(),
        ]);

        $this->contactActivityService->log(
            $contact,
            'contact_created',
            'Contact created',
            'Contact profile was created manually.',
            [
                'classification' => $contact->classification,
                'membership_status' => $contact->membership_status,
                'source' => $contact->source,
            ],
            $request->user()?->id
        );

        return $this->success([
            ...$contact->toArray(),
            'custom_fields' => $this->dynamicFieldService->getValuesMap('contacts', $contact->id),
        ], 'Contact created.', 201);
    }

    public function show(int $id)
    {
        $contact = Contact::findOrFail($id);

        return $this->success([
            ...$contact->toArray(),
            'custom_fields' => $this->dynamicFieldService->getValuesMap('contacts', $contact->id),
            'classification_history' => $contact->classificationHistory()->latest('change_date')->get(),
            'timeline' => $contact->activities()->with('performer:id,first_name,last_name,email')->get(),
        ]);
    }

    public function update(Request $request, int $id)
    {
        $contact = Contact::findOrFail($id);
        $oldClassification = $contact->classification;

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'source' => 'nullable|string|max:100',
            'classification' => 'nullable|string|max:100',
            'membership_status' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'custom_fields' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $contact->update($request->only([
            'first_name',
            'last_name',
            'email',
            'phone',
            'company',
            'source',
            'classification',
            'membership_status',
            'status',
            'notes',
        ]));

        $this->dynamicFieldService->saveValues('contacts', $contact->id, $request->input('custom_fields', []));

        $this->contactActivityService->log(
            $contact,
            'contact_updated',
            'Contact updated',
            'Contact profile details were updated.',
            [
                'updated_fields' => array_keys($request->except('custom_fields')),
            ],
            $request->user()?->id
        );

        if ($request->filled('classification') && $oldClassification !== $contact->classification) {
            ContactClassificationHistory::create([
                'contact_id' => $contact->id,
                'previous_classification' => $oldClassification,
                'new_classification' => $contact->classification,
                'changed_by' => $request->user()?->id,
                'change_date' => now(),
            ]);

            $this->contactActivityService->log(
                $contact,
                'classification_changed',
                'Classification changed',
                "Classification changed from {$oldClassification} to {$contact->classification}.",
                [
                    'previous' => $oldClassification,
                    'new' => $contact->classification,
                ],
                $request->user()?->id
            );
        }

        return $this->success([
            ...$contact->fresh()->toArray(),
            'custom_fields' => $this->dynamicFieldService->getValuesMap('contacts', $contact->id),
        ], 'Contact updated.');
    }

    public function import(Request $request)
    {
        $columnMapping = $request->input('column_mapping', []);
        if (is_string($columnMapping)) {
            $decoded = json_decode($columnMapping, true);
            $columnMapping = is_array($decoded) ? $decoded : [];
        }

        $duplicateResolutions = $request->input('duplicate_resolutions', []);
        if (is_string($duplicateResolutions)) {
            $decoded = json_decode($duplicateResolutions, true);
            $duplicateResolutions = is_array($decoded) ? $decoded : [];
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx',
            'update_existing' => 'nullable|boolean',
            'duplicate_resolutions' => 'nullable|array',
            'duplicate_resolutions.*.row_number' => 'required_with:duplicate_resolutions|integer|min:1',
            'duplicate_resolutions.*.action' => 'required_with:duplicate_resolutions|in:skip,update,merge',
            'duplicate_resolutions.*.field_choices' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $result = $this->contactImportService->import(
            $request->file('file'),
            (bool) $request->boolean('update_existing'),
            $request->user()?->id,
            $columnMapping,
            $duplicateResolutions
        );

        return $this->success($result, 'Import completed.');
    }

    public function importAnalyze(Request $request)
    {
        $columnMapping = $request->input('column_mapping', []);
        if (is_string($columnMapping)) {
            $decoded = json_decode($columnMapping, true);
            $columnMapping = is_array($decoded) ? $decoded : [];
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx',
            'column_mapping' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $analysis = $this->contactImportService->analyzeDuplicates(
            $request->file('file'),
            $columnMapping
        );

        return $this->success($analysis);
    }

    public function importPreview(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $preview = $this->contactImportService->preview($request->file('file'));
        return $this->success($preview);
    }
}
