<?php

namespace App\Console\Commands;

use App\Support\MediaStorage;
use Illuminate\Console\Command;

class TestMediaStorageCommand extends Command
{
    protected $signature = 'media:test-s3';

    protected $description = 'Test S3 upload permissions for the configured media bucket';

    public function handle(): int
    {
        if (!MediaStorage::usesCloud()) {
            $this->warn('MEDIA_DISK_DRIVER is not s3 — uploads use local disk.');

            return self::SUCCESS;
        }

        $bucket = config('filesystems.disks.public.bucket');
        $region = config('filesystems.disks.public.region');
        $this->info("Testing S3 bucket: {$bucket} ({$region})");

        $path = 'diagnostic/' . now()->format('Ymd-His') . '.txt';

        try {
            MediaStorage::put($path, 'media:test-s3');
            MediaStorage::delete($path);
            $this->info('S3 upload test passed.');

            return self::SUCCESS;
        } catch (\App\Exceptions\MediaStorageException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}
