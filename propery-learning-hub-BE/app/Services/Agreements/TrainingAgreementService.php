<?php

namespace App\Services\Agreements;

use App\Mail\TrainingAgreementCompletedMail;
use App\Models\TrainingAgreement;
use App\Support\MediaStorage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class TrainingAgreementService
{
    public static function academySignatureDataUrl(?string $agreementType = null): ?string
    {
        $cfg = TrainingAgreement::configForType($agreementType);
        $path = $cfg['academy_signature_path'] ?? config('training_agreement.academy_signature_path');
        if (!$path || !is_readable($path)) {
            return null;
        }

        $binary = file_get_contents($path);
        if ($binary === false) {
            return null;
        }

        $mime = str_ends_with(strtolower($path), '.png') ? 'image/png' : 'image/jpeg';

        return 'data:' . $mime . ';base64,' . base64_encode($binary);
    }

    public function tryAutoCompleteAfterEmailVerification(\App\Models\User $user): void
    {
        if (!$user->hasVerifiedEmail()) {
            return;
        }

        $agreement = TrainingAgreement::query()
            ->where('status', TrainingAgreement::STATUS_CLIENT_SIGNED)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereRaw('LOWER(client_email) = ?', [strtolower($user->email)]);
            })
            ->orderByDesc('id')
            ->first();

        if (!$agreement) {
            return;
        }

        if (!$agreement->user_id) {
            $this->linkToUser($agreement, (int) $user->id);
            $agreement->refresh();
        }

        try {
            $this->completeWithAcademyDefaults($agreement);
        } catch (\Throwable $e) {
            Log::error('Failed to auto-complete training agreement after email verification', [
                'agreement_id' => $agreement->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function completeWithAcademyDefaults(TrainingAgreement $agreement): TrainingAgreement
    {
        if ($agreement->isCompleted()) {
            return $agreement;
        }

        if (!$agreement->isClientSigned()) {
            throw new \InvalidArgumentException('Agreement must be client-signed before academy completion.');
        }

        $cfg = $agreement->agreementConfig();

        $agreement->update([
            'admin_signature_data' => self::academySignatureDataUrl($agreement->agreement_type),
            'admin_signed_name' => $cfg['academy_signatory_name'] ?? 'Freedom Property Academy',
            'admin_signed_position' => $cfg['academy_signatory_position'] ?? 'CEO',
            'admin_signed_at' => now(),
            'status' => TrainingAgreement::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        $agreement->refresh();

        $this->generateAndStorePdf($agreement);

        if (!$agreement->pdf_emailed_at) {
            $this->emailCompletedPdf($agreement->fresh());
        }

        return $agreement->fresh();
    }

    public function validateClientSignedToken(?string $token): ?TrainingAgreement
    {
        if (!$token) {
            return null;
        }

        $agreement = TrainingAgreement::query()
            ->where('public_token', $token)
            ->first();

        if (!$agreement || (! $agreement->isClientSigned() && ! $agreement->isCompleted())) {
            return null;
        }

        return $agreement;
    }

    public function requireAwaitingAdminToken(string $token, ?string $requiredType = null): TrainingAgreement
    {
        $agreement = TrainingAgreement::query()
            ->where('public_token', $token)
            ->first();

        if (!$agreement || !$agreement->isClientSigned()) {
            throw new \InvalidArgumentException('A valid client-signed agreement is required before continuing.');
        }

        if ($requiredType !== null && $agreement->agreement_type !== $requiredType) {
            $label = $requiredType === TrainingAgreement::TYPE_TRAINING
                ? 'paid Training Agreement'
                : 'Free Membership Agreement';
            throw new \InvalidArgumentException("A signed {$label} is required for this step.");
        }

        return $agreement;
    }

    public function linkToUser(TrainingAgreement $agreement, int $userId): void
    {
        if ($agreement->user_id && (int) $agreement->user_id !== $userId) {
            return;
        }

        $agreement->update(['user_id' => $userId]);
    }

    public function linkToPayment(TrainingAgreement $agreement, int $paymentId): void
    {
        $agreement->update(['academy_payment_id' => $paymentId]);
    }

    public function completeByAdmin(
        TrainingAgreement $agreement,
        string $adminSignatureData,
        string $adminSignedName,
        string $adminSignedPosition,
        int $adminUserId,
        ?string $ip = null,
    ): TrainingAgreement {
        if (!$agreement->isClientSigned()) {
            throw new \InvalidArgumentException('Only client-signed agreements can be completed by admin.');
        }

        $agreement->update([
            'admin_signature_data' => $adminSignatureData,
            'admin_signed_name' => $adminSignedName,
            'admin_signed_position' => $adminSignedPosition,
            'admin_signed_at' => now(),
            'admin_user_id' => $adminUserId,
            'admin_signed_ip' => $ip,
            'status' => TrainingAgreement::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        $agreement->refresh();

        $this->generateAndStorePdf($agreement);
        $this->emailCompletedPdf($agreement->fresh());

        return $agreement->fresh();
    }

    public function generateAndStorePdf(TrainingAgreement $agreement): string
    {
        $includeSignatures = function_exists('imagecreatetruecolor');

        if (!$includeSignatures) {
            Log::warning('Training agreement PDF generated without signature images — PHP GD extension is not loaded.', [
                'agreement_id' => $agreement->id,
                'php_binary' => PHP_BINARY,
                'php_version' => PHP_VERSION,
            ]);
        }

        $pdf = Pdf::loadView('agreements.training-agreement-pdf', [
            'agreement' => $agreement,
            'config' => $agreement->agreementConfig(),
            'paragraphs' => AgreementDocumentFactory::executedParagraphs(
                $agreement->agreement_type ?? TrainingAgreement::TYPE_TRAINING,
                $agreement
            ),
            'includeSignatures' => $includeSignatures,
        ])->setPaper('a4');

        $prefix = $agreement->isFreeMembership() ? 'free-membership-agreements' : 'training-agreements';
        $filename = $prefix . '/' . $agreement->public_token . '-' . Str::slug($agreement->client_full_name) . '.pdf';
        $binary = $pdf->output();

        MediaStorage::privateDisk()->put($filename, $binary);

        $agreement->update(['pdf_path' => $filename]);

        return $filename;
    }

    public function emailCompletedPdf(TrainingAgreement $agreement): void
    {
        if (!$agreement->pdf_path) {
            $this->generateAndStorePdf($agreement);
            $agreement->refresh();
        }

        try {
            $pdfBinary = MediaStorage::privateDisk()->get($agreement->pdf_path);
        } catch (Throwable $e) {
            Log::error('Failed to read training agreement PDF for email', [
                'agreement_id' => $agreement->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        $filename = $agreement->pdfFilenamePrefix() . '_' . $agreement->id . '.pdf';
        $adminEmail = $agreement->agreementConfig()['admin_notification_email']
            ?? config('training_agreement.admin_notification_email');

        Mail::to($agreement->client_email)
            ->send(new TrainingAgreementCompletedMail($agreement, $pdfBinary, $filename, 'client'));

        if ($adminEmail) {
            Mail::to($adminEmail)
                ->send(new TrainingAgreementCompletedMail($agreement, $pdfBinary, $filename, 'admin'));
        }

        $agreement->update(['pdf_emailed_at' => now()]);
    }
}
