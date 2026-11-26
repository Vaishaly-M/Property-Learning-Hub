<?php

namespace App\Support;

class FrontendOrigins
{
    /**
     * Origins allowed for CORS (full URLs, no trailing slash).
     *
     * @return list<string>
     */
    public static function allowed(): array
    {
        $defaults = [
            'http://localhost:3000',
            'http://localhost:3002',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3002',
            'https://dev.befreepropertyeducation.com',
            'https://api.befreepropertyeducation.com',
            'https://befreepropertyeducation.com',
            'https://freedompropertyacademy.com',
        ];

        $configured = array_filter(array_merge(
            [config('app.frontend_url')],
            self::parseList(env('CORS_ALLOWED_ORIGINS', '')),
        ));

        $expanded = [];

        foreach (array_merge($configured, $defaults) as $origin) {
            foreach (self::expandOriginVariants($origin) as $variant) {
                $expanded[] = $variant;
            }
        }

        return array_values(array_unique($expanded));
    }

    /**
     * Hostnames for Sanctum stateful domains (host or host:port).
     *
     * @return list<string>
     */
    public static function statefulDomains(): array
    {
        $defaults = [
            'localhost',
            'localhost:3000',
            '127.0.0.1',
            '127.0.0.1:8000',
            '::1',
        ];

        $domains = $defaults;

        foreach (self::allowed() as $origin) {
            $parsed = parse_url($origin);

            if (!$parsed || empty($parsed['host'])) {
                continue;
            }

            $host = $parsed['host'];
            $port = $parsed['port'] ?? null;
            $domains[] = $port ? "{$host}:{$port}" : $host;
        }

        $extra = self::parseList(env('SANCTUM_STATEFUL_DOMAINS', ''));

        return array_values(array_unique(array_merge($domains, $extra)));
    }

    /**
     * @return list<string>
     */
    private static function expandOriginVariants(string $origin): array
    {
        $origin = rtrim(trim($origin), '/');

        if ($origin === '') {
            return [];
        }

        $variants = [$origin];
        $parsed = parse_url($origin);

        if (!$parsed || empty($parsed['host'])) {
            return $variants;
        }

        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'];
        $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';

        if (str_starts_with($host, 'www.')) {
            $variants[] = "{$scheme}://" . substr($host, 4) . $port;
        } elseif (!in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            $variants[] = "{$scheme}://www.{$host}{$port}";
        }

        return $variants;
    }

    /**
     * @return list<string>
     */
    private static function parseList(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }

        return array_values(array_filter(array_map(
            fn (string $item) => rtrim(trim($item), '/'),
            explode(',', $value),
        )));
    }
}
