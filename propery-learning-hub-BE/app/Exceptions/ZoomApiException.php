<?php

namespace App\Exceptions;

use RuntimeException;

class ZoomApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 502,
        public readonly ?array $response = null,
    ) {
        parent::__construct($message, $status);
    }
}
