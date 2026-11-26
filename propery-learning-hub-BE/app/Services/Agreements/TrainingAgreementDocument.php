<?php

namespace App\Services\Agreements;

use App\Models\TrainingAgreement;

/**
 * Canonical Training Agreement text extracted from
 * Freedom_Property_Academy_Training_Agreement.docx — do not rewrite.
 */
class TrainingAgreementDocument
{
    public static function sourcePath(): string
    {
        return resource_path('agreements/training_agreement_source.txt');
    }

    /**
     * @return list<string>
     */
    public static function paragraphs(): array
    {
        $raw = file_get_contents(self::sourcePath());
        if ($raw === false) {
            return [];
        }

        $raw = str_replace(["\r\n", "\r"], "\n", $raw);
        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $raw)),
            static fn (string $line) => $line !== ''
        ));

        return $lines;
    }

    /**
     * Build the executed document text with party/signature blanks filled only.
     * Agreement clauses stay identical to the source extract.
     *
     * @return list<array{type: string, text: string}>
     */
    public static function executedParagraphs(?TrainingAgreement $agreement = null, ?array $config = null): array
    {
        $config ??= config('training_agreement');
        $paras = self::paragraphs();
        $out = [];

        foreach ($paras as $line) {
            // Fill only the party-identification blank line (template fields).
            if (str_starts_with($line, '(2) Client full name')) {
                if ($agreement) {
                    $line = '(2) Client full name, ' . $agreement->client_full_name
                        . ' of ' . $agreement->client_address
                        . ', date of birth ' . self::formatDob($agreement->client_dob)
                        . ' (“the Client”, “you”, “your”),';
                }
                $out[] = ['type' => 'p', 'text' => $line];
                continue;
            }

            // Signature / schedule blocks handled separately when agreement present.
            if ($line === 'Signatures' || str_starts_with($line, 'By signing below')) {
                continue;
            }
            if (str_starts_with($line, 'Signed for and on behalf of')
                || str_starts_with($line, 'Signed by the Client')
                || str_starts_with($line, 'Name:')
                || str_starts_with($line, 'Position:')
                || str_starts_with($line, 'Signature:')
                || str_starts_with($line, 'Date:')
                || str_starts_with($line, 'Schedule 1')
                || str_starts_with($line, '[Insert total Fee')
            ) {
                continue;
            }

            $out[] = ['type' => self::lineType($line), 'text' => $line];
        }

        if ($agreement) {
            $out[] = ['type' => 'h2', 'text' => 'Signatures'];
            $out[] = [
                'type' => 'p',
                'text' => 'By signing below, each Party confirms it has read, understood, and agrees to be bound by this Agreement.',
            ];

            $cfg = $agreement?->agreementConfig() ?? config('training_agreement');
            $academyName = $agreement?->admin_signed_name ?: ($cfg['academy_signatory_name'] ?? '');
            $academyPosition = $agreement?->admin_signed_position ?: ($cfg['academy_signatory_position'] ?? '');
            $academyDate = $agreement?->admin_signed_at ?? now();

            $out[] = ['type' => 'h3', 'text' => 'Signed for and on behalf of Freedom Property Academy:'];
            $out[] = ['type' => 'p', 'text' => 'Name: ' . ($academyName ?: '_____________________________')];
            $out[] = [
                'type' => 'p',
                'text' => 'Position: ' . ($academyPosition ?: '___________________________'),
            ];
            $out[] = ['type' => 'signature_admin', 'text' => ''];
            $out[] = [
                'type' => 'p',
                'text' => 'Date: ' . ($agreement
                    ? $academyDate->timezone(config('app.timezone'))->format('d/m/Y')
                    : '______________________________'),
            ];

            $out[] = ['type' => 'h3', 'text' => 'Signed by the Client:'];
            $out[] = ['type' => 'p', 'text' => 'Name: ' . $agreement->client_full_name];
            $out[] = ['type' => 'p', 'text' => 'Date of birth: ' . self::formatDob($agreement->client_dob)];
            $out[] = ['type' => 'signature_client', 'text' => ''];
            $out[] = [
                'type' => 'p',
                'text' => 'Date: ' . ($agreement->client_signed_at
                    ? $agreement->client_signed_at->timezone(config('app.timezone'))->format('d/m/Y')
                    : '______________________________'),
            ];

            $out[] = ['type' => 'h2', 'text' => 'Schedule 1 — Fees and Payment Plan'];
            $plan = $agreement->payment_plan === 'instalments'
                ? 'in instalments as set out below'
                : 'in full on or before the Commencement Date';
            $schedule = sprintf(
                'Total Fee: %s. Payment: %s.',
                $agreement->formattedFee(),
                $plan
            );
            if ($agreement->schedule_notes) {
                $schedule .= ' ' . $agreement->schedule_notes;
            }
            $out[] = ['type' => 'p', 'text' => $schedule];
        } else {
            $out[] = ['type' => 'h2', 'text' => 'Signatures'];
            $out[] = [
                'type' => 'p',
                'text' => 'By signing below, each Party confirms it has read, understood, and agrees to be bound by this Agreement.',
            ];
            $out[] = ['type' => 'h3', 'text' => 'Signed for and on behalf of Freedom Property Academy:'];
            $out[] = ['type' => 'p', 'text' => 'Name: _____________________________'];
            $out[] = ['type' => 'p', 'text' => 'Position: ___________________________'];
            $out[] = ['type' => 'p', 'text' => 'Signature: __________________________'];
            $out[] = ['type' => 'p', 'text' => 'Date: ______________________________'];
            $out[] = ['type' => 'h3', 'text' => 'Signed by the Client:'];
            $out[] = ['type' => 'p', 'text' => 'Name: _____________________________'];
            $out[] = ['type' => 'p', 'text' => 'Date of birth: ______________'];
            $out[] = ['type' => 'p', 'text' => 'Signature: __________________________'];
            $out[] = ['type' => 'p', 'text' => 'Date: ______________________________'];
            $out[] = ['type' => 'h2', 'text' => 'Schedule 1 — Fees and Payment Plan'];
            $out[] = [
                'type' => 'p',
                'text' => '[Insert total Fee, any instalment plan, payment method, and due dates here.]',
            ];
        }

        return $out;
    }

    private static function formatDob(mixed $dob): string
    {
        if ($dob === null || $dob === '') {
            return '______________';
        }

        try {
            if ($dob instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance(\DateTimeImmutable::createFromInterface($dob))->format('d/m/Y');
            }

            return \Carbon\Carbon::parse((string) $dob)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $dob;
        }
    }

    private static function lineType(string $line): string
    {
        if ($line === 'FREEDOM PROPERTY ACADEMY') {
            return 'h1';
        }
        if ($line === 'TRAINING & MEMBERSHIP SERVICES AGREEMENT') {
            return 'h1';
        }
        if ($line === 'BACKGROUND') {
            return 'h2';
        }
        if (preg_match('/^\d+\.\s/', $line) === 1) {
            return 'h2';
        }
        if (in_array($line, ['Signatures'], true) || str_starts_with($line, 'Schedule 1')) {
            return 'h2';
        }

        return 'p';
    }
}
