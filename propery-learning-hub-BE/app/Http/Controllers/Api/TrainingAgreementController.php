<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingAgreement;
use App\Models\User;
use App\Services\Agreements\AgreementDocumentFactory;
use App\Services\Agreements\TrainingAgreementService;
use App\Support\MediaStorage;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TrainingAgreementController extends Controller
{
    public function __construct(
        private readonly TrainingAgreementService $agreements,
    ) {}

    public function config(Request $request): JsonResponse
    {
        $type = $this->resolveAgreementType($request);
        $cfg = TrainingAgreement::configForType($type);
        $formattedFee = $type === TrainingAgreement::TYPE_FREE_MEMBERSHIP
            ? '£0.00 (fee waived)'
            : '£' . number_format(($cfg['fee_amount_pence'] ?? 0) / 100, 2);

        return response()->json([
            'success' => true,
            'data' => [
                'agreement_type' => $type,
                'version' => $cfg['version'],
                'company_name' => $cfg['company_name'],
                'company_number' => $cfg['company_number'],
                'company_address' => $cfg['company_address'],
                'trading_as' => $cfg['trading_as'],
                'fee_amount_pence' => $type === TrainingAgreement::TYPE_FREE_MEMBERSHIP
                    ? 0
                    : (int) ($cfg['fee_amount_pence'] ?? 0),
                'fee_currency' => $cfg['fee_currency'] ?? 'gbp',
                'formatted_fee' => $formattedFee,
                'privacy_policy_url' => $cfg['privacy_policy_url'],
                'academy_signatory' => [
                    'name' => $cfg['academy_signatory_name'] ?? '',
                    'position' => $cfg['academy_signatory_position'] ?? '',
                    'signature_data_url' => TrainingAgreementService::academySignatureDataUrl($type),
                    'date_display' => now()->timezone(config('app.timezone'))->format('d/m/Y'),
                ],
                'document_paragraphs' => AgreementDocumentFactory::paragraphs($type),
                'document_title' => $type === TrainingAgreement::TYPE_FREE_MEMBERSHIP
                    ? 'Promotional Membership & Marketing Consideration Agreement'
                    : 'Training & Membership Services Agreement',
            ],
        ]);
    }

    public function checkEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = strtolower($request->string('email')->toString());
        $registered = User::query()->whereRaw('LOWER(email) = ?', [$email])->exists();

        return response()->json([
            'success' => true,
            'data' => [
                'email' => $email,
                'available' => ! $registered,
                'registered' => $registered,
            ],
            'message' => $registered
                ? 'This email is already registered. Please log in instead.'
                : 'Email is available.',
        ], $registered ? 409 : 200);
    }

    public function checkPhone(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'max:40'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $phone = $request->string('phone')->toString();
        $registered = PhoneNumber::isRegistered($phone);

        return response()->json([
            'success' => true,
            'data' => [
                'phone' => $phone,
                'available' => ! $registered,
                'registered' => $registered,
            ],
            'message' => $registered
                ? 'This phone number is already registered. Please log in instead.'
                : 'Phone number is available.',
        ], $registered ? 409 : 200);
    }

    public function showByToken(string $token): JsonResponse
    {
        $agreement = TrainingAgreement::query()->where('public_token', $token)->first();
        if (!$agreement) {
            return response()->json(['success' => false, 'message' => 'Agreement not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $agreement->toPublicArray(),
        ]);
    }

    public function clientSign(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_full_name' => ['required', 'string', 'max:255'],
            'client_address' => ['required', 'string', 'max:2000'],
            'client_dob' => ['required', 'date', 'before:today'],
            'client_email' => [
                'required',
                'email',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $email = strtolower(trim((string) $value));
                    if ($email === '') {
                        return;
                    }
                    if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
                        $fail('This email is already registered. Please log in instead.');
                    }
                },
            ],
            'client_phone' => [
                'required',
                'string',
                'max:40',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $phone = trim((string) $value);
                    if ($phone === '') {
                        return;
                    }
                    if (PhoneNumber::isRegistered($phone)) {
                        $fail('This phone number is already registered. Please log in instead.');
                    }
                },
            ],
            'payment_plan' => ['nullable', 'in:full,instalments'],
            'schedule_notes' => ['nullable', 'string', 'max:2000'],
            'client_signature_data' => ['required', 'string', 'min:100'],
            'accepted_terms' => ['accepted'],
            'invite_token' => ['nullable', 'uuid'],
            'paid_invite_token' => ['nullable', 'uuid'],
            'agreement_type' => ['nullable', 'in:training,free_membership'],
        ], [
            'accepted_terms.accepted' => 'You must accept the Training & Membership Agreement to continue.',
            'client_signature_data.required' => 'Please draw your signature before submitting.',
            'client_phone.required' => 'Please enter your phone number.',
            'client_dob.required' => 'Please enter your date of birth.',
            'client_dob.before' => 'The date of birth must be a date before today.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!str_starts_with($request->string('client_signature_data')->toString(), 'data:image/')) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid signature format.',
            ], 422);
        }

        $freeInvite = null;
        if ($request->filled('invite_token')) {
            try {
                $inviteService = app(\App\Services\FreeRegistrationInviteService::class);
                $freeInvite = $inviteService->requireUsableToken(
                    $request->string('invite_token')->toString()
                );
                $inviteService->assertEmailMatches(
                    $freeInvite,
                    $request->string('client_email')->toString()
                );
            } catch (\InvalidArgumentException $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => ['invite_token' => [$e->getMessage()]],
                ], 422);
            }
        }

        $paidInvite = null;
        if ($request->filled('paid_invite_token')) {
            try {
                $paidInviteService = app(\App\Services\PaidUserInviteService::class);
                $paidInvite = $paidInviteService->requireUsableToken(
                    $request->string('paid_invite_token')->toString()
                );
                $paidInviteService->assertEmailMatches(
                    $paidInvite,
                    $request->string('client_email')->toString()
                );
            } catch (\InvalidArgumentException $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => ['paid_invite_token' => [$e->getMessage()]],
                ], 422);
            }
        }

        $agreementType = $this->resolveAgreementType($request);
        $cfg = TrainingAgreement::configForType($agreementType);

        $agreement = TrainingAgreement::create([
            'agreement_type' => $agreementType,
            'status' => TrainingAgreement::STATUS_CLIENT_SIGNED,
            'agreement_version' => $cfg['version'],
            'client_full_name' => $request->string('client_full_name')->toString(),
            'client_address' => $request->string('client_address')->toString(),
            'client_dob' => $request->input('client_dob'),
            'client_email' => strtolower($request->string('client_email')->toString()),
            'client_phone' => PhoneNumber::normalizeForStorage(
                (string) $request->input('client_phone')
            ),
            'fee_amount_pence' => $agreementType === TrainingAgreement::TYPE_FREE_MEMBERSHIP
                ? 0
                : (int) ($cfg['fee_amount_pence'] ?? 0),
            'fee_currency' => $cfg['fee_currency'] ?? 'gbp',
            'payment_plan' => $agreementType === TrainingAgreement::TYPE_FREE_MEMBERSHIP
                ? 'free'
                : $request->input('payment_plan', 'full'),
            'schedule_notes' => $request->input('schedule_notes'),
            'client_signature_data' => $request->string('client_signature_data')->toString(),
            'client_signed_at' => now(),
            'client_signed_ip' => $request->ip(),
            'client_user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ]);

        if ($freeInvite) {
            try {
                app(\App\Services\FreeRegistrationInviteService::class)
                    ->markSigned($freeInvite, (int) $agreement->id);
            } catch (\InvalidArgumentException $e) {
                Log::warning('Failed to mark free invite as signed', [
                    'agreement_id' => $agreement->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($paidInvite) {
            try {
                app(\App\Services\PaidUserInviteService::class)
                    ->markSigned($paidInvite, (int) $agreement->id);
            } catch (\InvalidArgumentException $e) {
                Log::warning('Failed to mark paid invite as signed', [
                    'agreement_id' => $agreement->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Agreement signed successfully. You can now continue to payment or registration.',
            'data' => $agreement->toPublicArray(),
        ], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = TrainingAgreement::query()
            ->with(['user:id,first_name,last_name,email,email_verified_at', 'adminUser:id,first_name,last_name,email'])
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('client_full_name', 'like', "%{$search}%")
                    ->orWhere('client_email', 'like', "%{$search}%")
                    ->orWhere('public_token', 'like', "%{$search}%");
            });
        }

        if ($request->filled('agreement_type') && $request->string('agreement_type')->toString() !== 'all') {
            $query->where('agreement_type', $request->string('agreement_type')->toString());
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $page = $query->paginate($perPage);

        $stats = null;
        if ($request->boolean('include_stats')) {
            $stats = [
                'total' => TrainingAgreement::query()->count(),
                'client_signed' => TrainingAgreement::query()->where('status', TrainingAgreement::STATUS_CLIENT_SIGNED)->count(),
                'completed' => TrainingAgreement::query()->where('status', TrainingAgreement::STATUS_COMPLETED)->count(),
                'pdf_emailed' => TrainingAgreement::query()->whereNotNull('pdf_emailed_at')->count(),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'data' => collect($page->items())->map(fn (TrainingAgreement $a) => $a->toAdminArray())->values(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'stats' => $stats,
            ],
        ]);
    }

    public function adminShow(TrainingAgreement $trainingAgreement): JsonResponse
    {
        $trainingAgreement->load(['user:id,first_name,last_name,email,email_verified_at', 'adminUser:id,first_name,last_name,email']);

        return response()->json([
            'success' => true,
            'data' => $trainingAgreement->toAdminArray(),
        ]);
    }

    public function adminAutoComplete(TrainingAgreement $trainingAgreement): JsonResponse
    {
        try {
            $agreement = $this->agreements->completeWithAcademyDefaults($trainingAgreement);

            return response()->json([
                'success' => true,
                'message' => 'Agreement completed and PDF emailed.',
                'data' => $agreement->load(['user:id,first_name,last_name,email,email_verified_at'])->toAdminArray(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('Failed to auto-complete training agreement', [
                'agreement_id' => $trainingAgreement->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete agreement: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function adminComplete(Request $request, TrainingAgreement $trainingAgreement): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'admin_signature_data' => ['required', 'string', 'min:100'],
            'admin_signed_name' => ['required', 'string', 'max:255'],
            'admin_signed_position' => ['required', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!str_starts_with($request->string('admin_signature_data')->toString(), 'data:image/')) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid signature format.',
            ], 422);
        }

        try {
            $agreement = $this->agreements->completeByAdmin(
                $trainingAgreement,
                $request->string('admin_signature_data')->toString(),
                $request->string('admin_signed_name')->toString(),
                $request->string('admin_signed_position')->toString(),
                (int) $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'message' => 'Agreement completed. PDF emailed to client and Academy.',
                'data' => $agreement->load(['user:id,first_name,last_name,email', 'adminUser:id,first_name,last_name,email'])->toAdminArray(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('Failed to complete training agreement', [
                'agreement_id' => $trainingAgreement->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete agreement: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function adminDownloadPdf(TrainingAgreement $trainingAgreement): StreamedResponse|JsonResponse
    {
        if (!$trainingAgreement->pdf_path) {
            if (!$trainingAgreement->isCompleted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF is available after both parties have signed.',
                ], 422);
            }
            $this->agreements->generateAndStorePdf($trainingAgreement);
            $trainingAgreement->refresh();
        }

        $path = $trainingAgreement->pdf_path;
        $disk = MediaStorage::privateDisk();
        if (!$disk->exists($path)) {
            return response()->json(['success' => false, 'message' => 'PDF file missing.'], 404);
        }

        $filename = $trainingAgreement->pdfFilenamePrefix() . '_' . $trainingAgreement->id . '.pdf';

        return response()->streamDownload(function () use ($disk, $path) {
            echo $disk->get($path);
        }, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function resolveAgreementType(Request $request): string
    {
        if ($request->filled('paid_invite_token')) {
            return TrainingAgreement::TYPE_TRAINING;
        }

        if ($request->filled('invite_token')) {
            return TrainingAgreement::TYPE_FREE_MEMBERSHIP;
        }

        $requested = $request->string('agreement_type')->toString();
        if (in_array($requested, [TrainingAgreement::TYPE_TRAINING, TrainingAgreement::TYPE_FREE_MEMBERSHIP], true)) {
            return $requested;
        }

        if ($request->string('type')->toString() === TrainingAgreement::TYPE_FREE_MEMBERSHIP) {
            return TrainingAgreement::TYPE_FREE_MEMBERSHIP;
        }

        return TrainingAgreement::TYPE_TRAINING;
    }
}
