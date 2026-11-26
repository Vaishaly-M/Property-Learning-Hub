<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use App\Support\MediaStorage;
use App\Support\MediaUploadPath;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Laravel\Sanctum\PersonalAccessToken;

class MediaController extends Controller
{
    /**
     * Serve stored media inline (images, thumbnails).
     * Accepts Bearer auth or ?token= for <img> tags that cannot send Authorization headers.
     */
    public function inline(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        auth()->setUser($user);

        $path = (string) $request->query('path', '');
        $path = ltrim($path, '/');

        if ($path === '' || str_contains($path, '..')) {
            abort(404, 'File not found');
        }

        if (!MediaStorage::exists($path)) {
            abort(404, 'File not found');
        }

        if (MediaUrl::isVideoPath($path)) {
            return MediaStorage::streamVideo($path, [
                'Cache-Control' => 'private, max-age=3600',
            ]);
        }

        return MediaStorage::inline($path, null, null, false, [
            'Cache-Control' => 'private, no-cache, max-age=0, must-revalidate',
        ]);
    }

    /**
     * Stream video/audio from S3 — redirects to a signed URL (for large files).
     * DB stores only the object key; the browser loads directly from S3.
     */
    public function stream(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        auth()->setUser($user);

        $path = ltrim((string) $request->query('path', ''), '/');

        if ($path === '' || str_contains($path, '..') || !MediaUploadPath::isAllowedPath($path)) {
            abort(404, 'File not found');
        }

        $private = MediaUploadPath::isPrivatePath($path);

        if (!MediaStorage::exists($path, $private)) {
            abort(404, 'File not found');
        }

        return MediaStorage::streamVideo($path, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Return a presigned S3 GET URL for playback (large videos).
     * Frontend sets this URL on &lt;video src&gt; — only the storage path is in the DB.
     */
    public function presignPlayback(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $path = ltrim($request->string('path')->toString(), '/');

        if (!MediaUploadPath::isAllowedPath($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Path is not allowed.',
            ], 422);
        }

        $private = MediaUploadPath::isPrivatePath($path);
        $playbackUrl = MediaUrl::playbackUrl($path, $private);

        if (!$playbackUrl) {
            return response()->json([
                'success' => false,
                'message' => 'File not found in storage.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'playback_url' => $playbackUrl,
                'path' => $path,
                'expires_in_seconds' => 4 * 3600,
            ],
        ]);
    }

    private function isVideoPath(string $path): bool
    {
        return MediaUrl::isVideoPath($path);
    }

    /**
     * Return S3 presigned upload URL for direct browser uploads (large videos).
     */
    public function presignUpload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'folder' => 'required|string|max:120',
            'filename' => 'required|string|max:255',
            'content_type' => 'required|string|max:127',
            'file_size' => 'required|integer|min:1|max:2147483648',
            'private' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $folder = trim($request->string('folder')->toString(), '/');
        if (!MediaUploadPath::isAllowedFolder($folder)) {
            return response()->json([
                'success' => false,
                'message' => 'Upload folder is not allowed.',
            ], 422);
        }

        $private = $request->boolean('private')
            || MediaUploadPath::isPrivatePath($folder . '/');

        if ($private && !MediaStorage::privateUsesCloud()) {
            return response()->json([
                'success' => false,
                'message' => 'Direct private S3 upload is not enabled.',
            ], 422);
        }

        if (!$private && !MediaStorage::usesCloud()) {
            return response()->json([
                'success' => false,
                'message' => 'Direct S3 upload is not enabled. Set MEDIA_DISK_DRIVER=s3 on the server.',
            ], 422);
        }

        if (preg_match('/^chat\/(\d+)$/', $folder, $matches)) {
            $chat = Chat::find((int) $matches[1]);
            $user = $request->user();
            if (!$chat || !$user || !$chat->hasMember($user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not allowed to upload to this chat folder.',
                ], 403);
            }
        }

        $path = MediaStorage::generateObjectKey($folder, $request->string('filename')->toString());

        $presigned = MediaStorage::presignedUploadUrl(
            $path,
            $request->string('content_type')->toString(),
            now()->addHours(2),
            $private,
        );

        $headers = [];
        foreach ($presigned['headers'] ?? [] as $name => $value) {
            if (is_array($value)) {
                $headers[$name] = $value[0] ?? '';
            } else {
                $headers[$name] = (string) $value;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'upload_url' => $presigned['url'],
                'path' => $path,
                'headers' => $headers,
            ],
        ]);
    }

    public function uploadConfig()
    {
        $directUpload = MediaStorage::usesCloud() || MediaStorage::privateUsesCloud();

        return response()->json([
            'success' => true,
            'data' => [
                'direct_upload_enabled' => $directUpload,
                'max_video_bytes' => 2 * 1024 * 1024 * 1024,
                'max_document_bytes' => $directUpload ? 2 * 1024 * 1024 * 1024 : 100 * 1024 * 1024,
                'max_thumbnail_bytes' => 5 * 1024 * 1024,
                'max_image_bytes' => 5 * 1024 * 1024,
            ],
        ]);
    }

    private function resolveUser(Request $request): ?User
    {
        if ($user = auth('sanctum')->user()) {
            return $user;
        }

        $token = $request->query('token');
        if (!$token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);

        return $accessToken?->tokenable;
    }

      public function authenticatedMedia(Request $request)
    {
        $path = $request->query('path');
        
        if (!$path) {
            return response()->json(['error' => 'Path parameter is required'], 400);
        }

        // Clean the path
        $path = ltrim($path, '/');
        
        // Check if the file exists
        if (!Storage::disk('public')->exists($path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        // Get the file
        $file = Storage::disk('public')->get($path);
        $mimeType = Storage::disk('public')->mimeType($path);
        
        // For audio files, set appropriate headers
        $headers = [
            'Content-Type' => $mimeType ?: 'audio/wav',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'public, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ];

        // If it's a WAV file, ensure proper headers
        if (str_ends_with($path, '.wav')) {
            $headers['Content-Type'] = 'audio/wav';
        }

        return response($file, 200, $headers);
    }
}
