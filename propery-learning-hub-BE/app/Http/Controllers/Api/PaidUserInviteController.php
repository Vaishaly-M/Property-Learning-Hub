<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaidUserInvite;
use App\Services\PaidUserInviteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PaidUserInviteController extends Controller
{
    public function __construct(
        private readonly PaidUserInviteService $invites,
    ) {}

    public function visit(string $token): JsonResponse
    {
        try {
            $invite = $this->invites->requireUsableToken($token);
            $invite = $this->invites->markOpened($invite);

            return response()->json([
                'success' => true,
                'data' => [
                    'email' => $invite->email,
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

        $query = PaidUserInvite::query()
            ->with(['creator:id,first_name,last_name,email'])
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
            'data' => $invites->through(fn (PaidUserInvite $invite) => $invite->toAdminArray()),
        ]);
    }

    public function adminStore(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $invite = $this->invites->createAndSend(
                $request->string('email')->toString(),
                (int) $request->user()->id,
            );

            $payload = $invite->toAdminArray();
            $emailSent = ! empty($payload['email_sent_at']);

            return response()->json([
                'success' => true,
                'message' => $emailSent
                    ? 'Paid invite link created and emailed successfully.'
                    : 'Paid invite link created, but the email could not be sent. Copy the link and share it manually.',
                'email_sent' => $emailSent,
                'data' => $payload,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Failed to create paid user invite', [
                'email' => $request->input('email'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create invite link.',
            ], 500);
        }
    }

    public function adminResendEmail(PaidUserInvite $paidUserInvite): JsonResponse
    {
        $paidUserInvite->refreshStatus();

        if (!$paidUserInvite->isUsable()) {
            return response()->json([
                'success' => false,
                'message' => 'Only active invite links can be resent.',
            ], 422);
        }

        try {
            $this->invites->sendInviteEmail($paidUserInvite);
            $fresh = $paidUserInvite->fresh(['creator']);

            return response()->json([
                'success' => true,
                'message' => 'Invite email resent successfully.',
                'email_sent' => true,
                'data' => $fresh?->toAdminArray(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to resend paid user invite email', [
                'invite_id' => $paidUserInvite->id,
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
