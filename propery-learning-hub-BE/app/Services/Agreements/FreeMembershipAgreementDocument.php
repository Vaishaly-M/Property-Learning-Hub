<?php

namespace App\Services\Agreements;

use App\Models\TrainingAgreement;

/**
 * Canonical Free Membership Agreement text extracted from
 * Freedom_Property_Academy_Free_Membership_Agreement.pdf — do not rewrite.
 */
class FreeMembershipAgreementDocument
{
    public static function sourcePath(): string
    {
        return resource_path('agreements/free_membership_agreement_source.txt');
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
     * @return list<array{type: string, text: string}>
     */
    public static function executedParagraphs(?TrainingAgreement $agreement = null): array
    {
        $config = $agreement?->agreementConfig() ?? config('free_membership_agreement');
        $paras = self::paragraphs();
        $out = [];
        $skipNextPartyLines = 0;

        foreach ($paras as $line) {
            if ($skipNextPartyLines > 0) {
                $skipNextPartyLines--;
                continue;
            }

            if (str_starts_with($line, '(2) Client full name')) {
                if ($agreement) {
                    $out[] = [
                        'type' => 'p',
                        'text' => '(2) Client full name, ' . $agreement->client_full_name
                            . ', of ' . $agreement->client_address
                            . ', date of birth ' . self::formatDob($agreement->client_dob)
                            . ' (“the Client”, “you”, “your”),',
                    ];
                } else {
                    $out[] = ['type' => 'p', 'text' => $line];
                }
                $skipNextPartyLines = 2;
                continue;
            }

            if (str_contains($line, '[insert promotion name/date]')) {
                $promotion = $config['default_promotion_label'] ?? 'Free membership invite registration';
                $line = str_replace('[insert promotion name/date]', $promotion, $line);
            }

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
            ) {
                continue;
            }

            $out[] = ['type' => self::lineType($line), 'text' => $line];
        }

        if ($agreement) {
            $out[] = ['type' => 'h2', 'text' => 'Signatures'];
            $out[] = [
                'type' => 'p',
                'text' => 'By signing below, each Party confirms it has read, understood, and agrees to be bound by this Agreement, including the Marketing Consideration given in exchange for the waiver of the Standard Fee.',
            ];

            $cfg = $agreement->agreementConfig();
            $academyName = $agreement->admin_signed_name ?: ($cfg['academy_signatory_name'] ?? '');
            $academyPosition = $agreement->admin_signed_position ?: ($cfg['academy_signatory_position'] ?? '');
            $academyDate = $agreement->admin_signed_at ?? now();

            $out[] = ['type' => 'h3', 'text' => 'Signed for and on behalf of Freedom Property Academy:'];
            $out[] = ['type' => 'p', 'text' => 'Name: ' . ($academyName ?: '_____________________________')];
            $out[] = ['type' => 'p', 'text' => 'Position: ' . ($academyPosition ?: '___________________________')];
            $out[] = ['type' => 'signature_admin', 'text' => ''];
            $out[] = [
                'type' => 'p',
                'text' => 'Date: ' . $academyDate->timezone(config('app.timezone'))->format('d/m/Y'),
            ];

            $out[] = ['type' => 'h3', 'text' => 'Signed by the Client:'];
            $out[] = ['type' => 'p', 'text' => 'Name: ' . $agreement->client_full_name];
            $out[] = ['type' => 'signature_client', 'text' => ''];
            $out[] = [
                'type' => 'p',
                'text' => 'Date: ' . ($agreement->client_signed_at
                    ? $agreement->client_signed_at->timezone(config('app.timezone'))->format('d/m/Y')
                    : '______________________________'),
            ];

            $out[] = ['type' => 'h2', 'text' => 'Schedule 1 — Marketing Consideration: Timelines and Thresholds'];
            foreach (self::scheduleLines() as $scheduleLine) {
                $out[] = ['type' => 'p', 'text' => $scheduleLine];
            }
        } else {
            $out[] = ['type' => 'h2', 'text' => 'Signatures'];
            $out[] = [
                'type' => 'p',
                'text' => 'By signing below, each Party confirms it has read, understood, and agrees to be bound by this Agreement, including the Marketing Consideration given in exchange for the waiver of the Standard Fee.',
            ];
            $out[] = ['type' => 'h3', 'text' => 'Signed for and on behalf of Freedom Property Academy:'];
            $out[] = ['type' => 'p', 'text' => 'Name: _____________________________'];
            $out[] = ['type' => 'p', 'text' => 'Position: ___________________________'];
            $out[] = ['type' => 'p', 'text' => 'Signature: __________________________'];
            $out[] = ['type' => 'p', 'text' => 'Date: ______________________________'];
            $out[] = ['type' => 'h3', 'text' => 'Signed by the Client:'];
            $out[] = ['type' => 'p', 'text' => 'Name: _____________________________'];
            $out[] = ['type' => 'p', 'text' => 'Signature: __________________________'];
            $out[] = ['type' => 'p', 'text' => 'Date: ______________________________'];
            $out[] = ['type' => 'h2', 'text' => 'Schedule 1 — Marketing Consideration: Timelines and Thresholds'];
            foreach (self::scheduleLines() as $scheduleLine) {
                $out[] = ['type' => 'p', 'text' => $scheduleLine];
            }
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private static function scheduleLines(): array
    {
        return [
            '• Portal Testimonial due: within 14 days of the Commencement Date',
            '• Strategy Day Testimonial due: within 7 days of the 1:1 strategy day',
            '• Completion Testimonial due: within 14 days of the end of the Client\'s support period under clause 4 (or achieving a First Deal, if earlier)',
            '• Minimum weekly meeting attendance: 80% of scheduled weekly meetings during the support period',
            '• Maximum permitted continuous non-engagement with the group chat: 30 days',
            '(These thresholds are defaults set by the Academy and may be adjusted for a specific promotion, provided the Client is made aware of the applicable figures before enrolling.)',
        ];
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
        if ($line === 'PROMOTIONAL MEMBERSHIP & MARKETING CONSIDERATION' || $line === 'AGREEMENT') {
            return 'h1';
        }
        if ($line === 'BACKGROUND') {
            return 'h2';
        }
        if (preg_match('/^\d+\.\s/', $line) === 1) {
            return 'h2';
        }
        if (str_starts_with($line, 'Schedule 1')) {
            return 'h2';
        }

        return 'p';
    }
}
