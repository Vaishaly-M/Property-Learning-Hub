<?php

namespace App\Support;

class MediaUrl
{
    /**
     * Return a browser-resolvable URL for stored media.
     * Images/thumbnails: API inline proxy (redirects to S3 when cloud).
     * Videos: stream endpoint (redirects to signed S3 URL — never proxied through PHP).
     */
    public static function url(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $storagePath = static::extractStoragePath($path);
            if ($storagePath && MediaStorage::usesCloud()) {
                return static::isVideoPath($storagePath)
                    ? static::streamPath($storagePath)
                    : static::inlinePath($storagePath);
            }

            return $path;
        }

        $storagePath = ltrim($path, '/');

        if (MediaStorage::usesCloud()) {
            return static::isVideoPath($storagePath)
                ? static::streamPath($storagePath)
                : static::inlinePath($storagePath);
        }

        $fullUrl = MediaStorage::url($path);

        $parsed = parse_url($fullUrl);
        $pathname = $parsed['path'] ?? '';

        if (str_contains($pathname, '/storage/')) {
            return $pathname;
        }

        if (str_starts_with($storagePath, 'storage/')) {
            $storagePath = substr($storagePath, strlen('storage/'));
        }

        return '/storage/' . $storagePath;
    }

    /**
     * Signed S3 playback URL for large video (FE uses directly in &lt;video src&gt;).
     * Falls back to stream path when not on cloud.
     */
    public static function playbackUrl(?string $path, bool $private = false): ?string
    {
        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $storagePath = static::extractStoragePath($path);
            $path = $storagePath ?? $path;
        }

        $storagePath = ltrim($path, '/');
        $private = $private || MediaUploadPath::isPrivatePath($storagePath);

        if (MediaStorage::usesCloud() || ($private && MediaStorage::privateUsesCloud())) {
            if (!MediaStorage::exists($storagePath, $private)) {
                return null;
            }

            return MediaStorage::temporaryUrl($storagePath, now()->addHours(4), $private);
        }

        return static::absoluteApiPath(static::streamPath($storagePath));
    }

    public static function absoluteApiPath(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $base = rtrim((string) config('app.url'), '/');
        if (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        return $base . $path;
    }

    public static function videoPlaybackUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $storagePath = ltrim($path, '/');
        $private = MediaUploadPath::isPrivatePath($storagePath);

        return static::playbackUrl($storagePath, $private);
    }

    /** Learner course video stream (enrollment checks on the controller). */
    public static function contentStreamPath(int $contentId): string
    {
        return '/api/learner/content/' . $contentId . '/stream';
    }

    public static function streamPath(string $storagePath): string
    {
        return '/api/media/stream?path=' . rawurlencode(ltrim($storagePath, '/'));
    }

    public static function inlinePath(string $storagePath): string
    {
        return '/api/media/inline?path=' . rawurlencode(ltrim($storagePath, '/'));
    }

    public static function isVideoPath(string $path): bool
    {
        $path = ltrim($path, '/');
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (in_array($ext, ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'], true)) {
            return true;
        }

        return str_contains($path, 'content/videos/')
            || str_contains($path, 'past-recordings/')
            || str_contains($path, 'webinar-recordings/');
    }

    private static function extractStoragePath(string $url): ?string
    {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';
        $pathname = ltrim($parsed['path'] ?? '', '/');

        if ($pathname === '') {
            return null;
        }

        if (str_contains($host, 'amazonaws.com') || str_contains($host, 'cloudfront.net')) {
            return $pathname;
        }

        return null;
    }
}
