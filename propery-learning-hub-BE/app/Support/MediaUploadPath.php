<?php

namespace App\Support;

class MediaUploadPath
{
    /** @var list<string> */
    private const ALLOWED_FOLDERS = [
        'content/videos',
        'content/documents',
        'content/thumbnails',
        'courses/thumbnails',
        'modules/thumbnails',
        'webinar-thumbnails',
        'past-recordings',
        'webinar-recordings',
        'deals',
        'profile-photos',
        'contracts',
        'chat/avatars',
        'learner-id-docs',
    ];

    /** @var list<string> */
    private const PRIVATE_PREFIXES = [
        'webinar-recordings/',
        'learner-id-docs/',
    ];

    public static function isAllowedFolder(string $folder): bool
    {
        $folder = trim($folder, '/');

        if (in_array($folder, self::ALLOWED_FOLDERS, true)) {
            return true;
        }

        return (bool) preg_match('/^chat\/\d+$/', $folder);
    }

    public static function isAllowedPath(string $path): bool
    {
        if ($path === '' || str_contains($path, '..')) {
            return false;
        }

        $path = ltrim($path, '/');

        foreach (self::ALLOWED_FOLDERS as $folder) {
            if (str_starts_with($path, $folder . '/')) {
                return true;
            }
        }

        return (bool) preg_match('/^chat\/\d+\//', $path);
    }

    public static function isPrivatePath(string $path): bool
    {
        $path = ltrim($path, '/');

        foreach (self::PRIVATE_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
