<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use GuzzleHttp\Client;
use Pusher\Pusher;

$client = new Client([
    'verify' => false,
    'curl' => [
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ],
]);

$pusher = new Pusher(
    env('PUSHER_APP_KEY'),
    env('PUSHER_APP_SECRET'),
    env('PUSHER_APP_ID'),
    ['cluster' => env('PUSHER_APP_CLUSTER'), 'useTLS' => true],
    $client
);

try {
    $pusher->trigger('test-channel', 'test-event', ['message' => 'hello']);
    echo "Pusher OK\n";
} catch (Throwable $e) {
    echo "Pusher FAILED: " . $e->getMessage() . "\n";
    exit(1);
}
