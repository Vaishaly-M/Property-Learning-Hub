<?php

namespace App\Support;

use App\Models\User;

final class PhoneNumber
{
    /**
     * @return list<string>
     */
    public static function digitVariants(string $phone): array
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) < 7) {
            return [];
        }

        $variants = [$digits];

        // UK local 07… ↔ +44 7…
        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            $variants[] = '44' . substr($digits, 1);
        }
        if (str_starts_with($digits, '44') && strlen($digits) >= 11) {
            $variants[] = '0' . substr($digits, 2);
            $variants[] = substr($digits, 2); // national number without trunk 0
        }

        // UK mobile entered without leading 0 (e.g. 7123456789)
        if (str_starts_with($digits, '7') && strlen($digits) === 10) {
            $variants[] = '0' . $digits;
            $variants[] = '44' . $digits;
        }

        // Strip common country codes so "+44XXXXXXXX" / "+94XXXXXXXX" match "XXXXXXXX"
        foreach (['971', '966', '94', '91', '61', '44', '1'] as $cc) {
            if (str_starts_with($digits, $cc) && strlen($digits) > strlen($cc) + 6) {
                $national = substr($digits, strlen($cc));
                $variants[] = $national;
                if (!str_starts_with($national, '0')) {
                    $variants[] = '0' . $national;
                }
            }
        }

        return array_values(array_unique($variants));
    }

    public static function areEquivalent(string $a, string $b): bool
    {
        $aVariants = self::digitVariants($a);
        $bVariants = self::digitVariants($b);

        if ($aVariants === [] || $bVariants === []) {
            return false;
        }

        if (array_intersect($aVariants, $bVariants) !== []) {
            return true;
        }

        // One value is the other with a short dialling/country-code prefix
        // e.g. "32534565645" vs "+4432534565645"
        foreach ($aVariants as $av) {
            foreach ($bVariants as $bv) {
                if (self::oneIsCountryPrefixed($av, $bv)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static function oneIsCountryPrefixed(string $a, string $b): bool
    {
        if ($a === $b) {
            return true;
        }

        $longer = strlen($a) >= strlen($b) ? $a : $b;
        $shorter = strlen($a) >= strlen($b) ? $b : $a;

        if (strlen($shorter) < 7) {
            return false;
        }

        $prefixLen = strlen($longer) - strlen($shorter);

        // Country / dialling codes are typically 1–4 digits
        return $prefixLen >= 1
            && $prefixLen <= 4
            && str_ends_with($longer, $shorter);
    }

    public static function isRegistered(string $phone): bool
    {
        $incoming = self::digitVariants($phone);
        if ($incoming === []) {
            return false;
        }

        $existingPhones = User::query()
            ->whereNotNull('phone_number')
            ->where('phone_number', '!=', '')
            ->pluck('phone_number');

        foreach ($existingPhones as $existing) {
            if (self::areEquivalent($phone, (string) $existing)) {
                return true;
            }
        }

        return false;
    }

    public static function normalizeForStorage(string $phone): string
    {
        $trimmed = trim($phone);
        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        if ($digits === '') {
            return $trimmed;
        }

        if (str_starts_with($digits, '44') && strlen($digits) >= 11) {
            return '+' . $digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            return '+44' . substr($digits, 1);
        }

        if (str_starts_with($digits, '7') && strlen($digits) === 10) {
            return '+44' . $digits;
        }

        if (str_starts_with($trimmed, '+')) {
            return '+' . $digits;
        }

        return $digits;
    }
}
