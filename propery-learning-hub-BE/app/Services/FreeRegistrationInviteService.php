<?php

namespace App\Services;

use App\Mail\FreeRegistrationInviteMail;
use App\Models\FreeRegistrationInvite;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class FreeRegistrationInviteService
{
    public function getOrCreateOpenInvite(?int $adminUserId = null): FreeRegistrationInvite
    {
        $invite = FreeRegistrationInvite::query()
            ->where('is_open', true)
            ->where('status', '!=', FreeRegistrationInvite::STATUS_EXPIRED)
            ->orderByDesc('id')
            ->first();

        if ($invite) {
            return $invite->loadMissing('creator');
        }

        return FreeRegistrationInvite::create([
            'email' => FreeRegistrationInvite::OPEN_EMAIL_PLACEHOLDER,
            'is_open' => true,
            'status' => FreeRegistrationInvite::STATUS_GENERATED,
            'expires_at' => null,
            'created_by' => $adminUserId,
        ])->load('creator');
    }

    public function createAndSend(string $email, int $adminUserId): FreeRegistrationInvite
    {
        $email = strtolower(trim($email));

        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw new \InvalidArgumentException('This email is already registered.');
        }

        $activeInvite = FreeRegistrationInvite::query()
            ->where('is_open', false)
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereIn('status', [
                FreeRegistrationInvite::STATUS_GENERATED,
                FreeRegistrationInvite::STATUS_CLICKED,
            ])
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists();

        if ($activeInvite) {
            throw new \InvalidArgumentException('An active invite link already exists for this email.');
        }

        $invite = FreeRegistrationInvite::create([
            'email' => $email,
            'is_open' => false,
            'status' => FreeRegistrationInvite::STATUS_GENERATED,
            'expires_at' => now()->addDays(FreeRegistrationInvite::EXPIRY_DAYS),
            'created_by' => $adminUserId,
        ]);

        try {
            $this->sendInviteEmail($invite);
        } catch (\RuntimeException $e) {
            Log::warning('Free invite created without successful email delivery', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
                'error' => $e->getMessage(),
            ]);
        }

        return $invite->fresh(['creator']);
    }

    /**
     * @param  list<string>  $emails
     * @return array{created: list<array<string, mixed>>, failed: list<array{email: string, error: string}>}
     */
    public function createManyAndSend(array $emails, int $adminUserId): array
    {
        $created = [];
        $failed = [];

        foreach ($emails as $email) {
            try {
                $invite = $this->createAndSend((string) $email, $adminUserId);
                $created[] = $invite->toAdminArray();
            } catch (\InvalidArgumentException $e) {
                $failed[] = [
                    'email' => strtolower(trim((string) $email)),
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'created' => $created,
            'failed' => $failed,
        ];
    }

    public function sendInviteEmail(FreeRegistrationInvite $invite): bool
    {
        if ($invite->isOpen()) {
            throw new \RuntimeException('Open invite links are not emailed — copy and share the link instead.');
        }

        try {
            Mail::mailer(config('mail.default'))
                ->to($invite->email)
                ->send(new FreeRegistrationInviteMail($invite->fresh() ?? $invite));

            $invite->update(['email_sent_at' => now()]);

            Log::info('Free registration invite email sent', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to send free registration invite email', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \RuntimeException(
                'Invite created but email could not be sent (' . $e->getMessage() . '). You can copy the link manually.',
                0,
                $e
            );
        }
    }

    public function findByToken(string $token): ?FreeRegistrationInvite
    {
        $invite = FreeRegistrationInvite::query()->where('token', $token)->first();
        if (!$invite) {
            return null;
        }

        $invite->refreshStatus();

        return $invite;
    }

    public function requireUsableToken(string $token): FreeRegistrationInvite
    {
        $invite = $this->findByToken($token);
        if (!$invite) {
            throw new \InvalidArgumentException('Invite link not found.');
        }

        if ($invite->isOpen()) {
            if (!$invite->isUsable()) {
                throw new \InvalidArgumentException('This open invite link is no longer available.');
            }

            return $invite;
        }

        if ($invite->status === FreeRegistrationInvite::STATUS_JOINED) {
            throw new \InvalidArgumentException('This invite link has already been used.');
        }

        if ($invite->status === FreeRegistrationInvite::STATUS_EXPIRED || $invite->isExpired()) {
            throw new \InvalidArgumentException('This invite link has expired.');
        }

        return $invite;
    }

    public function markClicked(FreeRegistrationInvite $invite): FreeRegistrationInvite
    {
        $invite->refreshStatus();

        if (!$invite->isUsable()) {
            return $invite;
        }

        // Open links stay reusable — only stamp first click time
        if ($invite->isOpen()) {
            if (!$invite->clicked_at) {
                $invite->update(['clicked_at' => now()]);
            }

            return $invite->fresh();
        }

        if ($invite->status === FreeRegistrationInvite::STATUS_GENERATED) {
            $invite->update([
                'status' => FreeRegistrationInvite::STATUS_CLICKED,
                'clicked_at' => now(),
            ]);
        }

        return $invite->fresh();
    }

    public function assertEmailMatches(FreeRegistrationInvite $invite, string $email): void
    {
        if ($invite->isOpen()) {
            return;
        }

        if (strcasecmp($invite->email, trim($email)) !== 0) {
            throw new \InvalidArgumentException('This invite link is only valid for ' . $invite->email . '.');
        }
    }

    public function markSigned(FreeRegistrationInvite $invite, int $agreementId): void
    {
        $invite->refreshStatus();

        if ($invite->isOpen()) {
            if (!$invite->clicked_at) {
                $invite->update(['clicked_at' => now()]);
            }

            return;
        }

        if (!$invite->isUsable() && $invite->status !== FreeRegistrationInvite::STATUS_CLICKED) {
            return;
        }

        $invite->update([
            'status' => FreeRegistrationInvite::STATUS_CLICKED,
            'clicked_at' => $invite->clicked_at ?? now(),
            'training_agreement_id' => $agreementId,
        ]);
    }

    public function markJoined(FreeRegistrationInvite $invite, int $userId, ?string $email = null): void
    {
        if ($invite->isOpen()) {
            $userEmail = $email
                ? strtolower(trim($email))
                : (string) (User::query()->where('id', $userId)->value('email') ?? '');

            // Keep the open link reusable; record this registration separately for tracking
            FreeRegistrationInvite::create([
                'email' => $userEmail !== '' ? $userEmail : FreeRegistrationInvite::OPEN_EMAIL_PLACEHOLDER,
                'is_open' => false,
                'status' => FreeRegistrationInvite::STATUS_JOINED,
                'expires_at' => null,
                'clicked_at' => now(),
                'joined_at' => now(),
                'user_id' => $userId,
                'created_by' => $invite->created_by,
                'training_agreement_id' => $invite->training_agreement_id,
            ]);

            if (!$invite->clicked_at) {
                $invite->update(['clicked_at' => now()]);
            }

            return;
        }

        $invite->update([
            'status' => FreeRegistrationInvite::STATUS_JOINED,
            'joined_at' => now(),
            'user_id' => $userId,
        ]);
    }

    public function expireStaleInvites(): int
    {
        return FreeRegistrationInvite::query()
            ->where('is_open', false)
            ->whereIn('status', [
                FreeRegistrationInvite::STATUS_GENERATED,
                FreeRegistrationInvite::STATUS_CLICKED,
            ])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => FreeRegistrationInvite::STATUS_EXPIRED]);
    }
}
