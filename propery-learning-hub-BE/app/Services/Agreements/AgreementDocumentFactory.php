<?php

namespace App\Services\Agreements;

use App\Models\TrainingAgreement;

class AgreementDocumentFactory
{
    public static function resolve(string $type): string
    {
        return match ($type) {
            TrainingAgreement::TYPE_FREE_MEMBERSHIP => FreeMembershipAgreementDocument::class,
            default => TrainingAgreementDocument::class,
        };
    }

    /**
     * @return list<string>
     */
    public static function paragraphs(string $type): array
    {
        $class = self::resolve($type);

        return $class::paragraphs();
    }

    /**
     * @return list<array{type: string, text: string}>
     */
    public static function executedParagraphs(string $type, ?TrainingAgreement $agreement = null): array
    {
        $class = self::resolve($type);

        return $class::executedParagraphs($agreement);
    }
}
