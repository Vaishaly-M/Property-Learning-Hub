<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Contact;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ContactImportService
{
    private const STANDARD_MAP = [
        'first_name' => ['first_name', 'firstname', 'first name'],
        'last_name' => ['last_name', 'lastname', 'last name'],
        'email' => ['email', 'email_address', 'email address'],
        'phone' => ['phone', 'phone_number', 'phone number', 'mobile'],
        'company' => ['company'],
        'source' => ['source', 'lead_source', 'lead source'],
        'classification' => ['classification'],
        'membership_status' => ['membership_status', 'membership status'],
        'status' => ['status'],
        'notes' => ['notes', 'note'],
    ];

    public function __construct(
        private DynamicFieldService $dynamicFieldService,
        private ContactActivityService $contactActivityService
    ) {}

    public function preview(UploadedFile $file): array
    {
        $rows = $this->extractRows($file);
        if (empty($rows)) {
            return ['headers' => [], 'sample_rows' => []];
        }

        $headers = array_map(fn ($h) => (string) $h, array_shift($rows));

        return [
            'headers' => $headers,
            'sample_rows' => array_slice($rows, 0, 5),
        ];
    }

    public function analyzeDuplicates(UploadedFile $file, array $columnMapping = []): array
    {
        $parsed = $this->parseMappedRows($file, $columnMapping);
        $conflicts = [];
        $newCount = 0;
        $invalidCount = count($parsed['errors']);

        foreach ($parsed['rows'] as $item) {
            $existing = $this->findExistingContact($item['payload']);
            if (!$existing) {
                $newCount++;
                continue;
            }

            $diffFields = $this->diffFields($existing, $item['payload']);
            $conflicts[] = [
                'row_number' => $item['row_number'],
                'match_by' => $this->matchType($existing, $item['payload']),
                'existing' => $this->contactSnapshot($existing),
                'incoming' => $item['payload'],
                'diff_fields' => $diffFields,
            ];
        }

        return [
            'summary' => [
                'total' => count($parsed['rows']) + $invalidCount,
                'new' => $newCount,
                'duplicates' => count($conflicts),
                'invalid' => $invalidCount,
            ],
            'conflicts' => $conflicts,
            'errors' => $parsed['errors'],
        ];
    }

    public function import(
        UploadedFile $file,
        bool $updateExisting,
        ?int $performedByUserId = null,
        array $columnMapping = [],
        array $duplicateResolutions = []
    ): array {
        $parsed = $this->parseMappedRows($file, $columnMapping);
        $moduleFields = $this->dynamicFieldService->listFields('contacts')->keyBy('field_key');
        $resolutionMap = $this->normalizeResolutions($duplicateResolutions);

        $result = [
            'created' => 0,
            'updated' => 0,
            'skipped' => count($parsed['errors']),
            'merged' => 0,
            'errors' => $parsed['errors'],
        ];

        DB::transaction(function () use (
            $parsed,
            $updateExisting,
            $performedByUserId,
            $columnMapping,
            $moduleFields,
            $resolutionMap,
            &$result
        ) {
            foreach ($parsed['rows'] as $item) {
                $rowNumber = $item['row_number'];
                $payload = $item['payload'];
                $normalized = $item['raw'];
                $existing = $this->findExistingContact($payload);

                if ($existing) {
                    $action = $resolutionMap[$rowNumber] ?? null;
                    if (!$action) {
                        $action = $updateExisting
                            ? ['action' => 'update']
                            : ['action' => 'skip'];
                    }

                    if (($action['action'] ?? 'skip') === 'skip') {
                        $result['skipped']++;
                        continue;
                    }

                    if (($action['action'] ?? '') === 'merge') {
                        $merged = $this->mergePayload($existing, $payload, $action['field_choices'] ?? []);
                        $existing->update(array_filter($merged, fn ($v) => $v !== null && $v !== ''));
                        $contact = $existing->fresh();
                        $result['merged']++;
                        $this->logImportActivity($contact, true, $performedByUserId, 'merge');
                    } else {
                        $existing->update(array_filter($payload, fn ($v) => $v !== null && $v !== ''));
                        $contact = $existing->fresh();
                        $result['updated']++;
                        $this->logImportActivity($contact, true, $performedByUserId, 'update');
                    }
                } else {
                    $contact = Contact::create([
                        ...$payload,
                        'first_name' => $payload['first_name'] ?? 'Unknown',
                        'classification' => $payload['classification'] ?? 'enquiries',
                        'membership_status' => $payload['membership_status'] ?? 'none',
                        'status' => $payload['status'] ?? 'active',
                        'created_by' => $performedByUserId,
                        'last_activity_date' => now(),
                    ]);
                    $result['created']++;
                    $this->logImportActivity($contact, false, $performedByUserId, 'create');
                }

                $customValues = $this->extractCustomValues($columnMapping, $item['header_index'], $normalized, $moduleFields);
                $this->dynamicFieldService->saveValues('contacts', $contact->id, $customValues);

                ActivityLog::create([
                    'user_id' => $performedByUserId,
                    'action' => $existing ? 'Contact Updated via Import' : 'Contact Imported',
                    'details' => json_encode([
                        'contact_id' => $contact->id,
                        'email' => $contact->email,
                        'phone' => $contact->phone,
                        'row_number' => $rowNumber,
                    ]),
                    'performed_by' => $performedByUserId,
                    'performed_by_name' => 'System Import',
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ]);
            }
        });

        return $result;
    }

    private function parseMappedRows(UploadedFile $file, array $columnMapping): array
    {
        $rows = $this->extractRows($file);
        if (empty($rows)) {
            return ['rows' => [], 'errors' => ['No rows found in file.']];
        }

        $headers = array_map(fn ($h) => $this->normalizeHeader((string) $h), array_shift($rows));
        $headerIndex = [];
        foreach ($headers as $idx => $header) {
            $headerIndex[$header] = $idx;
        }

        $parsedRows = [];
        $errors = [];

        foreach ($rows as $rowNumber => $row) {
            $normalized = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $row);
            if ($this->isRowEmpty($normalized)) {
                continue;
            }

            $payload = $this->buildPayload($normalized, $headerIndex, $columnMapping);
            $fileRow = $rowNumber + 2;

            if (empty($payload['first_name']) && empty($payload['email']) && empty($payload['phone'])) {
                $errors[] = "Row {$fileRow}: missing identity fields (first_name/email/phone).";
                continue;
            }

            $parsedRows[] = [
                'row_number' => $fileRow,
                'payload' => $payload,
                'raw' => $normalized,
                'header_index' => $headerIndex,
            ];
        }

        return ['rows' => $parsedRows, 'errors' => $errors];
    }

    private function buildPayload(array $normalized, array $headerIndex, array $columnMapping): array
    {
        $payload = [];
        foreach (self::STANDARD_MAP as $target => $aliases) {
            $mappedColumn = $this->findMappedColumnForTarget($target, $columnMapping);
            $idx = $mappedColumn !== null
                ? ($headerIndex[$this->normalizeHeader($mappedColumn)] ?? null)
                : $this->findHeaderIndex($aliases, $headerIndex);
            if ($idx === null) {
                continue;
            }
            $value = $normalized[$idx] ?? null;
            if ($value !== null && $value !== '') {
                $payload[$target] = $value;
            }
        }

        return $payload;
    }

    private function findExistingContact(array $payload): ?Contact
    {
        if (!empty($payload['email'])) {
            $byEmail = Contact::where('email', $payload['email'])->first();
            if ($byEmail) {
                return $byEmail;
            }
        }
        if (!empty($payload['phone'])) {
            return Contact::where('phone', $payload['phone'])->first();
        }

        return null;
    }

    private function matchType(Contact $existing, array $payload): string
    {
        if (!empty($payload['email']) && $existing->email === $payload['email']) {
            return 'email';
        }

        return 'phone';
    }

    private function contactSnapshot(Contact $contact): array
    {
        return [
            'id' => $contact->id,
            'first_name' => $contact->first_name,
            'last_name' => $contact->last_name,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'company' => $contact->company,
            'source' => $contact->source,
            'classification' => $contact->classification,
            'membership_status' => $contact->membership_status,
            'status' => $contact->status,
            'notes' => $contact->notes,
        ];
    }

    private function diffFields(Contact $existing, array $payload): array
    {
        $diff = [];
        foreach ($payload as $field => $incoming) {
            $current = $existing->{$field} ?? null;
            if ((string) $current !== (string) $incoming) {
                $diff[] = $field;
            }
        }

        return $diff;
    }

    private function mergePayload(Contact $existing, array $payload, array $fieldChoices): array
    {
        $merged = [];
        foreach ($payload as $field => $incoming) {
            $choice = $fieldChoices[$field] ?? 'incoming';
            if ($choice === 'existing') {
                $merged[$field] = $existing->{$field};
            } else {
                $merged[$field] = $incoming;
            }
        }

        return $merged;
    }

    private function normalizeResolutions(array $duplicateResolutions): array
    {
        $map = [];
        foreach ($duplicateResolutions as $entry) {
            if (!is_array($entry) || !isset($entry['row_number'])) {
                continue;
            }
            $map[(int) $entry['row_number']] = [
                'action' => $entry['action'] ?? 'skip',
                'field_choices' => $entry['field_choices'] ?? [],
            ];
        }

        return $map;
    }

    private function extractCustomValues(
        array $columnMapping,
        array $headerIndex,
        array $normalized,
        $moduleFields
    ): array {
        $customValues = [];
        foreach ($columnMapping as $columnName => $targetField) {
            if (!is_string($targetField) || !str_starts_with($targetField, 'custom:')) {
                continue;
            }

            $idx = $headerIndex[$this->normalizeHeader((string) $columnName)] ?? null;
            if ($idx === null) {
                continue;
            }

            $fieldKey = Str::after($targetField, 'custom:');
            $field = $moduleFields->get($fieldKey);
            if (!$field) {
                continue;
            }
            $customValues[$field->field_key] = $normalized[$idx] ?? null;
        }

        if (empty($customValues)) {
            foreach ($headerIndex as $header => $idx) {
                $field = $moduleFields->get(Str::snake($header));
                if (!$field) {
                    continue;
                }
                $customValues[$field->field_key] = $normalized[$idx] ?? null;
            }
        }

        return $customValues;
    }

    private function logImportActivity(
        Contact $contact,
        bool $isUpdate,
        ?int $performedByUserId,
        string $mode
    ): void {
        $this->contactActivityService->log(
            $contact,
            $isUpdate ? 'contact_import_updated' : 'contact_import_created',
            $isUpdate ? 'Contact updated via import' : 'Contact imported',
            $isUpdate
                ? "Contact updated from import ({$mode})."
                : 'A new contact was created from import.',
            ['import_mode' => $mode, 'email' => $contact->email, 'phone' => $contact->phone],
            $performedByUserId
        );
    }

    private function findMappedColumnForTarget(string $targetField, array $columnMapping): ?string
    {
        foreach ($columnMapping as $column => $target) {
            if ($target === $targetField) {
                return (string) $column;
            }
        }

        return null;
    }

    private function extractRows(UploadedFile $file): array
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        if ($extension === 'csv' || $extension === 'txt') {
            return $this->readCsv($file);
        }
        if ($extension === 'xlsx') {
            return $this->readXlsx($file);
        }

        abort(422, 'Only CSV and XLSX files are supported.');
    }

    private function readCsv(UploadedFile $file): array
    {
        $rows = [];
        $handle = fopen($file->getRealPath(), 'r');
        if (!$handle) {
            return $rows;
        }

        while (($data = fgetcsv($handle)) !== false) {
            $rows[] = $data;
        }
        fclose($handle);

        return $rows;
    }

    private function readXlsx(UploadedFile $file): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($file->getRealPath()) !== true) {
            return [];
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
        $zip->close();

        if (!$sheetXml) {
            return [];
        }

        $sharedStrings = [];
        if ($sharedXml) {
            $shared = simplexml_load_string($sharedXml);
            if ($shared && isset($shared->si)) {
                foreach ($shared->si as $si) {
                    $sharedStrings[] = (string) ($si->t ?? '');
                }
            }
        }

        $sheet = simplexml_load_string($sheetXml);
        if (!$sheet || !isset($sheet->sheetData)) {
            return [];
        }

        $rows = [];
        foreach ($sheet->sheetData->row as $row) {
            $rowData = [];
            foreach ($row->c as $cell) {
                $ref = (string) $cell['r'];
                $colLetters = preg_replace('/\d+/', '', $ref);
                $index = $this->columnLettersToIndex($colLetters);

                $value = (string) ($cell->v ?? '');
                if ((string) $cell['t'] === 's') {
                    $value = $sharedStrings[(int) $value] ?? '';
                }

                $rowData[$index] = $value;
            }

            if (!empty($rowData)) {
                ksort($rowData);
                $rows[] = array_values($rowData);
            }
        }

        return $rows;
    }

    private function normalizeHeader(string $header): string
    {
        return strtolower(trim(str_replace(['-', '_'], ' ', $header)));
    }

    private function findHeaderIndex(array $aliases, array $headerIndex): ?int
    {
        foreach ($aliases as $alias) {
            $normalized = $this->normalizeHeader($alias);
            if (array_key_exists($normalized, $headerIndex)) {
                return $headerIndex[$normalized];
            }
        }

        return null;
    }

    private function columnLettersToIndex(string $letters): int
    {
        $letters = strtoupper($letters);
        $index = 0;
        for ($i = 0; $i < strlen($letters); $i++) {
            $index = $index * 26 + (ord($letters[$i]) - ord('A') + 1);
        }

        return max(0, $index - 1);
    }

    private function isRowEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if ($value !== null && $value !== '') {
                return false;
            }
        }

        return true;
    }
}
