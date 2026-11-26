<?php

/**
 * Build the public S3 base URL from bucket + region when AWS_URL is not set.
 */
if (!function_exists('mediaS3PublicUrl')) {
    function mediaS3PublicUrl(): ?string
    {
        if ($url = env('AWS_URL')) {
            return rtrim($url, '/');
        }

        $bucket = env('AWS_BUCKET');
        $region = env('AWS_DEFAULT_REGION', 'us-east-1');

        if (!$bucket) {
            return null;
        }

        return "https://{$bucket}.s3.{$region}.amazonaws.com";
    }
}

/**
 * Shared AWS S3 disk settings — only AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_DEFAULT_REGION, and AWS_BUCKET are required in .env.
 *
 * @return array<string, mixed>
 */
if (!function_exists('mediaS3DiskConfig')) {
    function mediaS3DiskConfig(?string $root = null): array
    {
        $config = [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => mediaS3PublicUrl(),
            'throw' => true,
            'report' => true,
            'http' => [
                // Windows local PHP often lacks CA bundle (cURL error 60)
                'verify' => env('APP_ENV') !== 'local',
            ],
        ];

        if ($root !== null) {
            $config['root'] = $root;
        }

        return $config;
    }
}

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'media_disk' => env('MEDIA_DISK', 'public'),
    'media_private_disk' => env('MEDIA_PRIVATE_DISK', 'private'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => env('MEDIA_DISK_DRIVER', 'local') === 's3'
            ? mediaS3DiskConfig()
            : [
                'driver' => 'local',
                'root' => storage_path('app/public'),
                'url' => env('APP_URL').'/storage',
                'visibility' => 'public',
                'throw' => false,
                'report' => false,
            ],

        'private' => env('MEDIA_DISK_DRIVER', 'local') === 's3'
            ? mediaS3DiskConfig('private')
            : [
                'driver' => 'local',
                'root' => storage_path('app/private'),
                'visibility' => 'private',
                'throw' => false,
                'report' => false,
            ],

        's3' => mediaS3DiskConfig(),

    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
