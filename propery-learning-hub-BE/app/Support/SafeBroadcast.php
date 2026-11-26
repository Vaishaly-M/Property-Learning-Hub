<?php

namespace App\Support;

class SafeBroadcast
{
    public static function toOthers(object $event): void
    {
        try {
            broadcast($event)->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
