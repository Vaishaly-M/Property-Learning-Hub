<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectUpload
{
    /**
     * Resolve a storage path uploaded directly to S3 from the browser.
     *
     * @return string|JsonResponse|null null when the path field was not sent
     */
    public static function resolvePath(Request $request, string $pathField = 'file_path'): string|JsonResponse|null
    {
        if (!$request->filled($pathField)) {
            return null;
        }

        $path = ltrim($request->string($pathField)->toString(), '/');

        if (!MediaUploadPath::isAllowedPath($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file path.',
            ], 422);
        }

        $private = MediaUploadPath::isPrivatePath($path);

        if (!MediaStorage::exists($path, $private)) {
            return response()->json([
                'success' => false,
                'message' => 'Uploaded file was not found in storage. Please try uploading again.',
            ], 422);
        }

        return $path;
    }

    /**
     * @return array{path: string, name: string, size: int, mime: string}|JsonResponse|null
     */
    public static function resolveFileMeta(
        Request $request,
        string $pathField = 'file_path',
        string $nameField = 'file_name',
        string $sizeField = 'file_size',
        ?string $mimeField = 'mime_type',
    ): array|JsonResponse|null {
        $path = static::resolvePath($request, $pathField);

        if ($path instanceof JsonResponse) {
            return $path;
        }

        if ($path === null) {
            return null;
        }

        $private = MediaUploadPath::isPrivatePath($path);

        return [
            'path' => $path,
            'name' => $request->string($nameField)->toString() ?: basename($path),
            'size' => (int) $request->input($sizeField, 0),
            'mime' => $request->filled($mimeField)
                ? $request->string($mimeField)->toString()
                : (MediaStorage::mimeType($path, $private) ?? 'application/octet-stream'),
        ];
    }
}
