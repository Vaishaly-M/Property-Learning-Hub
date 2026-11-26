<?php

namespace App\Support;

use App\Exceptions\MediaStorageException;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class MediaStorage
{
    public static function diskName(): string
    {
        return (string) config('filesystems.media_disk', 'public');
    }

    public static function privateDiskName(): string
    {
        return (string) config('filesystems.media_private_disk', 'private');
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(static::diskName());
    }

    public static function privateDisk(): Filesystem
    {
        return Storage::disk(static::privateDiskName());
    }

    public static function usesCloud(): bool
    {
        return static::driverFor(static::diskName()) === 's3';
    }

    public static function privateUsesCloud(): bool
    {
        return static::driverFor(static::privateDiskName()) === 's3';
    }

    public static function url(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return static::disk()->url($path);
    }

    /**
     * Normalize a stored media path for disk lookups (S3 keys, legacy /storage/ paths, full S3 URLs).
     */
    public static function normalizePath(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $path = trim($path);
        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $parsed = parse_url($path);
            $host = $parsed['host'] ?? '';
            $pathname = ltrim($parsed['path'] ?? '', '/');

            if ($pathname === '') {
                return null;
            }

            if (str_contains($host, 'amazonaws.com') || str_contains($host, 'cloudfront.net')) {
                return $pathname;
            }

            if (str_contains($pathname, 'storage/')) {
                $storageKey = preg_replace('#^storage/#', '', $pathname) ?: '';
                while (str_starts_with($storageKey, 'storage/')) {
                    $storageKey = substr($storageKey, strlen('storage/'));
                }

                return $storageKey !== '' ? $storageKey : null;
            }

            return null;
        }

        $path = ltrim($path, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path !== '' ? $path : null;
    }

    public static function isPrivatePath(?string $path): bool
    {
        $path = static::normalizePath($path);

        return $path ? MediaUploadPath::isPrivatePath($path) : false;
    }

    public static function exists(?string $path, bool $private = false): bool
    {
        $path = static::normalizePath($path);
        if (!$path) {
            return false;
        }

        try {
            $disk = $private ? static::privateDisk() : static::disk();

            return $disk->exists($path);
        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('MediaStorage exists check failed', [
                'path' => $path,
                'private' => $private,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public static function delete(?string $path, bool $private = false): bool
    {
        $path = static::normalizePath($path);
        if (!$path) {
            return false;
        }

        try {
            $disk = $private ? static::privateDisk() : static::disk();

            if (!$disk->exists($path)) {
                return false;
            }

            return $disk->delete($path);
        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('MediaStorage delete failed', [
                'path' => $path,
                'private' => $private,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public static function store(UploadedFile $file, string $directory): string
    {
        return static::upload(function () use ($file, $directory) {
            $path = $file->store($directory, static::publicStoreOptions());
            static::assertStored($path);

            return $path;
        });
    }

    public static function storeAs(string $directory, string $name, UploadedFile $file): string
    {
        return static::upload(function () use ($directory, $name, $file) {
            $path = $file->storeAs($directory, $name, static::publicStoreOptions());
            static::assertStored($path);

            return $path;
        });
    }

    public static function storePrivate(UploadedFile $file, string $directory, ?string $name = null): string
    {
        return static::upload(function () use ($file, $directory, $name) {
            $path = $name
                ? $file->storeAs($directory, $name, static::privateStoreOptions())
                : $file->store($directory, static::privateStoreOptions());

            static::assertStored($path, true);

            return $path;
        });
    }

    public static function put(string $path, mixed $contents): bool
    {
        return static::upload(function () use ($path, $contents) {
            $options = static::usesCloud() && static::useAcl() ? ['visibility' => 'public'] : [];

            if (!static::disk()->put($path, $contents, $options)) {
                throw new \RuntimeException("Upload failed: could not write file at [{$path}]");
            }

            static::assertStored($path);

            return true;
        });
    }

    public static function mimeType(string $path, bool $private = false): ?string
    {
        $path = static::normalizePath($path);
        if (!$path) {
            return null;
        }

        $disk = $private ? static::privateDisk() : static::disk();

        return $disk->mimeType($path) ?: null;
    }

    public static function temporaryUrl(
        string $path,
        \DateTimeInterface $expiration,
        bool $private = false,
        array $options = [],
    ): string {
        $path = static::normalizePath($path);
        if (!$path) {
            throw new \InvalidArgumentException('Invalid media path.');
        }

        $disk = $private ? static::privateDisk() : static::disk();

        return $disk->temporaryUrl($path, $expiration, $options);
    }

    /**
     * Presigned PUT URL so the browser can upload directly to S3 (large videos).
     *
     * @return array{url: string, headers: array<string, mixed>}
     */
    public static function presignedUploadUrl(
        string $path,
        string $contentType,
        \DateTimeInterface $expiration,
        bool $private = false,
    ): array {
        if (!static::usesCloud() && !$private) {
            throw new \RuntimeException('Direct S3 upload requires MEDIA_DISK_DRIVER=s3.');
        }

        if ($private && !static::privateUsesCloud()) {
            throw new \RuntimeException('Direct private S3 upload requires MEDIA_DISK_DRIVER=s3.');
        }

        $disk = $private ? static::privateDisk() : static::disk();

        return $disk->temporaryUploadUrl($path, $expiration, [
            'ContentType' => $contentType,
        ]);
    }

    public static function generateObjectKey(string $folder, string $originalFilename): string
    {
        $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION) ?: '');
        $safeExtension = $extension !== '' && preg_match('/^[a-z0-9]{1,8}$/', $extension) ? $extension : 'bin';

        return rtrim($folder, '/') . '/' . \Illuminate\Support\Str::random(20) . '.' . $safeExtension;
    }

    /**
     * Stream or download a file (works for local disk and S3).
     */
    public static function download(
        string $path,
        ?string $name = null,
        ?string $mime = null,
        bool $private = false,
    ): Response|StreamedResponse {
        return static::serve($path, $name, $mime, 'attachment', $private);
    }

    /**
     * Inline file response (documents, images).
     */
    public static function inline(
        string $path,
        ?string $name = null,
        ?string $mime = null,
        bool $private = false,
        array $extraHeaders = [],
    ): Response|StreamedResponse {
        return static::serve($path, $name, $mime, 'inline', $private, $extraHeaders);
    }

    /**
     * Video stream — redirects to a signed S3 URL when on cloud storage.
     */
    public static function streamVideo(string $path, array $extraHeaders = []): Response|StreamedResponse
    {
        if (!static::exists($path)) {
            abort(404, 'File not found');
        }

        if (static::usesCloud()) {
            return redirect(static::temporaryUrl($path, now()->addHours(2)));
        }

        $mime = static::mimeType($path) ?: 'video/mp4';

        return response()->file(static::disk()->path($path), array_merge([
            'Content-Type' => $mime,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, max-age=3600',
        ], $extraHeaders));
    }

    private static function serve(
        string $path,
        ?string $name,
        ?string $mime,
        string $disposition,
        bool $private = false,
        array $extraHeaders = [],
    ): Response|StreamedResponse {
        $path = static::normalizePath($path);
        if (!$path) {
            abort(404, 'File not found');
        }

        $disk = $private ? static::privateDisk() : static::disk();

        if (!$disk->exists($path)) {
            abort(404, 'File not found');
        }

        $mime ??= $disk->mimeType($path) ?: 'application/octet-stream';
        $name ??= basename($path);
        $dispositionHeader = $disposition . '; filename="' . str_replace('"', '\\"', $name) . '"';

        if (static::driverFor($private ? static::privateDiskName() : static::diskName()) === 's3') {
            $signedUrl = static::temporaryUrl($path, now()->addHours(2), $private);

            // Browser fetch() cannot read cross-origin S3 redirect bodies (CORS → "Failed to fetch").
            // API clients that send Accept: application/json get a signed URL instead.
            $accept = strtolower((string) request()->header('Accept', ''));
            if (request()->wantsJson() || str_contains($accept, 'application/json')) {
                return response()->json([
                    'success' => true,
                    'message' => 'Download URL ready.',
                    'data' => [
                        'download_url' => $signedUrl,
                        'url' => $signedUrl,
                        'file_name' => $name,
                        'mime' => $mime,
                        'inline' => $disposition === 'inline',
                    ],
                ]);
            }

            return redirect($signedUrl);
        }

        if ($disposition === 'attachment') {
            return response()->download($disk->path($path), $name, array_merge([
                'Content-Type' => $mime,
            ], $extraHeaders));
        }

        return response()->file($disk->path($path), array_merge([
            'Content-Type' => $mime,
            'Content-Disposition' => $dispositionHeader,
        ], $extraHeaders));
    }

    private static function driverFor(string $diskName): string
    {
        return (string) config("filesystems.disks.{$diskName}.driver", 'local');
    }

    /** @return array{disk: string, visibility?: string} */
    private static function publicStoreOptions(): array
    {
        $options = ['disk' => static::diskName()];

        if (static::usesCloud() && static::useAcl()) {
            $options['visibility'] = 'public';
        }

        return $options;
    }

    /** @return array{disk: string, visibility?: string} */
    private static function privateStoreOptions(): array
    {
        $options = ['disk' => static::privateDiskName()];

        if (static::privateUsesCloud() && static::useAcl()) {
            $options['visibility'] = 'private';
        }

        return $options;
    }

    private static function useAcl(): bool
    {
        return false;
    }

    private static function assertStored(string $path, bool $private = false): void
    {
        if (!static::exists($path, $private)) {
            throw new MediaStorageException(
                'Upload failed: file was not stored. Check AWS credentials, bucket name, and IAM permissions (s3:PutObject, s3:GetObject).'
            );
        }
    }

    /**
     * @template T
     * @param  callable(): T  $callback
     * @return T
     */
    private static function upload(callable $callback): mixed
    {
        try {
            return $callback();
        } catch (MediaStorageException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw static::mapUploadException($e);
        }
    }

    private static function mapUploadException(Throwable $e): MediaStorageException
    {
        $awsMessage = static::extractAwsMessage($e);
        $bucket = (string) config('filesystems.disks.public.bucket', '');

        if ($awsMessage && str_contains($awsMessage, 'AccessDenied')) {
            return new MediaStorageException(
                "S3 access denied: IAM user cannot upload to bucket [{$bucket}]. "
                . 'Add s3:PutObject, s3:GetObject, and s3:DeleteObject permissions for this bucket in AWS IAM.',
                502,
            );
        }

        if ($awsMessage && str_contains($awsMessage, 'NoSuchBucket')) {
            return new MediaStorageException(
                "S3 bucket [{$bucket}] does not exist or is in the wrong region.",
                502,
            );
        }

        return new MediaStorageException(
            $awsMessage ?? $e->getMessage(),
            502,
        );
    }

    private static function extractAwsMessage(Throwable $e): ?string
    {
        $current = $e;

        while ($current !== null) {
            $message = $current->getMessage();

            if (str_contains($message, 'AccessDenied')
                || str_contains($message, 'NoSuchBucket')
                || str_contains($message, 'InvalidAccessKeyId')) {
                return $message;
            }

            $current = $current->getPrevious();
        }

        return null;
    }
}
