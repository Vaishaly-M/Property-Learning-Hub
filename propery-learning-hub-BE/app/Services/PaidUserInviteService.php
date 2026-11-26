<?php

namespace App\Services;

use App\Mail\PaidUserInviteMail;
use App\Models\PaidUserInvite;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PaidUserInviteService
{
    public function createAndSend(string $email, int $adminUserId): PaidUserInvite
    {
        $email = strtolower(trim($email));

        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw new \InvalidArgumentException('This email is already registered.');
        }

        $activeInvite = PaidUserInvite::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereIn('status', [
                PaidUserInvite::STATUS_GENERATED,
                PaidUserInvite::STATUS_OPEN,
                PaidUserInvite::STATUS_SIGNED,
            ])
            ->where('expires_at', '>', now())
            ->exists();

        if ($activeInvite) {
            throw new \InvalidArgumentException('An active paid invite link already exists for this email.');
        }

        $invite = PaidUserInvite::create([
            'email' => $email,
            'status' => PaidUserInvite::STATUS_GENERATED,
            'expires_at' => now()->addDays(3),
            'created_by' => $adminUserId,
        ]);

        try {
            $this->sendInviteEmail($invite);
        } catch (\RuntimeException $e) {
            Log::warning('Paid invite created without successful email delivery', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
                'error' => $e->getMessage(),
            ]);
        }

        return $invite->fresh(['creator']);
    }

    public function sendInviteEmail(PaidUserInvite $invite): bool
    {
        try {
            Mail::mailer(config('mail.default'))
                ->to($invite->email)
                ->send(new PaidUserInviteMail($invite->fresh() ?? $invite));

            $invite->update(['email_sent_at' => now()]);

            Log::info('Paid user invite email sent', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to send paid user invite email', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException(
                'Invite created but email could not be sent (' . $e->getMessage() . '). You can copy the link manually.',
                0,
                $e
            );
        }
    }

    public function findByToken(string $token): ?PaidUserInvite
    {
        $invite = PaidUserInvite::query()->where('token', $token)->first();
        if (!$invite) {
            return null;
        }

        $invite->refreshStatus();

        return $invite;
    }

    public function requireUsableToken(string $token): PaidUserInvite
    {
        $invite = $this->findByToken($token);
        if (!$invite) {
            throw new \InvalidArgumentException('Invite link not found.');
        }

        if ($invite->status === PaidUserInvite::STATUS_JOINED) {
            throw new \InvalidArgumentException('This invite link has already been used.');
        }

        if ($invite->status === PaidUserInvite::STATUS_EXPIRED || $invite->isExpired()) {
            throw new \InvalidArgumentException('This invite link has expired.');
        }

        return $invite;
    }

    public function markOpened(PaidUserInvite $invite): PaidUserInvite
    {
        $invite->refreshStatus();

        if (!$invite->isUsable()) {
            return $invite;
        }

        if (in_array($invite->status, [PaidUserInvite::STATUS_GENERATED], true)) {
            $invite->update([
                'status' => PaidUserInvite::STATUS_OPEN,
                'opened_at' => now(),
            ]);
        }

        return $invite->fresh();
    }

    public function assertEmailMatches(PaidUserInvite $invite, string $email): void
    {
        if (strcasecmp($invite->email, trim($email)) !== 0) {
            throw new \InvalidArgumentException('This invite link is only valid for ' . $invite->email . '.');
        }
    }

    public function markSigned(PaidUserInvite $invite, int $agreementId): void
    {
        $invite->refreshStatus();

        if (!$invite->isUsable() && $invite->status !== PaidUserInvite::STATUS_SIGNED) {
            return;
        }

        $invite->update([
            'status' => PaidUserInvite::STATUS_SIGNED,
            'signed_at' => $invite->signed_at ?? now(),
            'training_agreement_id' => $agreementId,
        ]);
    }

    public function linkPayment(PaidUserInvite $invite, int $paymentId): void
    {
        $invite->update(['academy_payment_id' => $paymentId]);
    }

    public function markJoined(PaidUserInvite $invite, int $userId): void
    {
        $invite->update([
            'status' => PaidUserInvite::STATUS_JOINED,
            'joined_at' => now(),
            'user_id' => $userId,
        ]);
    }

    public function expireStaleInvites(): int
    {
        return PaidUserInvite::query()
            ->whereIn('status', [
                PaidUserInvite::STATUS_GENERATED,
                PaidUserInvite::STATUS_OPEN,
                PaidUserInvite::STATUS_SIGNED,
            ])
            ->where('expires_at', '<=', now())
            ->update(['status' => PaidUserInvite::STATUS_EXPIRED]);
    }
}
