<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FreeRegistrationInvite;
use App\Services\FreeRegistrationInviteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FreeRegistrationInviteController extends Controller
{
    public function __construct(
        private readonly FreeRegistrationInviteService $invites,
    ) {}

    public function visit(string $token): JsonResponse
    {
        try {
            $invite = $this->invites->requireUsableToken($token);
            $invite = $this->invites->markClicked($invite);

            return response()->json([
                'success' => true,
                'data' => [
                    'email' => $invite->isOpen() ? null : $invite->email,
                    'is_open' => $invite->isOpen(),
                    'expires_at' => $invite->expires_at?->toISOString(),
                    'status' => $invite->status,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $this->invites->expireStaleInvites();

        $query = FreeRegistrationInvite::query()
            ->with(['creator:id,first_name,last_name,email'])
            ->where('is_open', false)
            ->where('email', '!=', FreeRegistrationInvite::OPEN_EMAIL_PLACEHOLDER)
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->string('status')->toString() !== 'all') {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $search = '%' . $request->string('search')->toString() . '%';
            $query->where('email', 'like', $search);
        }

        $invites = $query->paginate((int) $request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $invites->through(fn (FreeRegistrationInvite $invite) => $invite->toAdminArray()),
        ]);
    }

    public function adminOpenLink(Request $request): JsonResponse
    {
        $invite = $this->invites->getOrCreateOpenInvite((int) $request->user()->id);

        return response()->json([
            'success' => true,
            'data' => $invite->toAdminArray(),
        ]);
    }

    public function adminStore(Request $request): JsonResponse
    {
        $emails = $this->parseEmailsInput($request);

        if ($emails === []) {
            return response()->json([
                'success' => false,
                'message' => 'Enter at least one email address.',
            ], 422);
        }

        if (count($emails) > 50) {
            return response()->json([
                'success' => false,
                'message' => 'You can invite at most 50 emails at once.',
            ], 422);
        }

        $invalid = [];
        foreach ($emails as $email) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $invalid[] = $email;
            }
        }

        if ($invalid !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email address(es): ' . implode(', ', array_slice($invalid, 0, 5))
                    . (count($invalid) > 5 ? '…' : ''),
                'errors' => ['email' => $invalid],
            ], 422);
        }

        try {
            $result = $this->invites->createManyAndSend(
                $emails,
                (int) $request->user()->id,
            );

            $createdCount = count($result['created']);
            $failedCount = count($result['failed']);
            $sentCount = count(array_filter(
                $result['created'],
                static fn (array $row) => !empty($row['email_sent_at'])
            ));

            if ($createdCount === 0) {
                $firstError = $result['failed'][0]['error'] ?? 'Failed to create invite links.';

                return response()->json([
                    'success' => false,
                    'message' => $firstError,
                    'created_count' => 0,
                    'failed_count' => $failedCount,
                    'failed' => $result['failed'],
                ], 422);
            }

            $message = $createdCount === 1
                ? ($sentCount === 1
                    ? 'Invite link created and emailed successfully.'
                    : 'Invite link created, but the email could not be sent. Copy the link and share it manually.')
                : sprintf(
                    '%d invite link(s) created (%d emailed)%s.',
                    $createdCount,
                    $sentCount,
                    $failedCount > 0 ? ", {$failedCount} skipped" : ''
                );

            return response()->json([
                'success' => true,
                'message' => $message,
                'email_sent' => $sentCount > 0,
                'created_count' => $createdCount,
                'failed_count' => $failedCount,
                'data' => $createdCount === 1 ? $result['created'][0] : $result['created'],
                'failed' => $result['failed'],
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Failed to create free registration invite(s)', [
                'emails' => $emails,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create invite link(s).',
            ], 500);
        }
    }

    /**
     * @return list<string>
     */
    private function parseEmailsInput(Request $request): array
    {
        $raw = $request->input('emails', $request->input('email', ''));

        if (is_array($raw)) {
            $parts = $raw;
        } else {
            $parts = preg_split('/[,;\n\r]+/', (string) $raw) ?: [];
        }

        $emails = [];
        foreach ($parts as $part) {
            $email = strtolower(trim((string) $part));
            if ($email === '') {
                continue;
            }
            $emails[] = $email;
        }

        return array_values(array_unique($emails));
    }

    public function adminResendEmail(FreeRegistrationInvite $freeRegistrationInvite): JsonResponse
    {
        $freeRegistrationInvite->refreshStatus();

        if (!$freeRegistrationInvite->isUsable()) {
            return response()->json([
                'success' => false,
                'message' => 'Only active invite links can be resent.',
            ], 422);
        }

        try {
            $this->invites->sendInviteEmail($freeRegistrationInvite);
            $fresh = $freeRegistrationInvite->fresh(['creator']);

            return response()->json([
                'success' => true,
                'message' => 'Invite email resent successfully.',
                'email_sent' => true,
                'data' => $fresh?->toAdminArray(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to resend free registration invite email', [
                'invite_id' => $freeRegistrationInvite->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e instanceof \RuntimeException
                    ? $e->getMessage()
                    : 'Failed to resend invite email.',
                'email_sent' => false,
            ], 422);
        }
    }
}
