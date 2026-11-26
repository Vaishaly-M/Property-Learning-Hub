<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo 'Mail default: ' . config('mail.default') . PHP_EOL;
echo 'SMTP host: ' . config('mail.mailers.smtp.host') . PHP_EOL;
echo 'SMTP port: ' . config('mail.mailers.smtp.port') . PHP_EOL;
echo 'From: ' . config('mail.from.address') . PHP_EOL;

try {
    Illuminate\Support\Facades\Mail::raw('Invite mail connectivity test', function ($m) {
        $m->to('test@example.com')->subject('Mail test');
    });
    echo 'RESULT: SEND_OK' . PHP_EOL;
} catch (Throwable $e) {
    echo 'RESULT: SEND_FAIL' . PHP_EOL;
    echo $e->getMessage() . PHP_EOL;
}
