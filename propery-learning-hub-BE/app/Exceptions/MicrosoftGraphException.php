<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MicrosoftGraphException extends Exception
{
    public function __construct(
        string $message,
        public readonly int $statusCode = 502,
        public readonly ?array $graphError = null,
    ) {
        parent::__construct($message, $statusCode);
    }

    /**
     * Map upstream Microsoft HTTP codes so we never return 401/403 to the browser
     * (the SPA treats those as expired Sanctum sessions and logs the user out).
     */
    public static function clientStatus(int $upstreamStatus): int
    {
        if (in_array($upstreamStatus, [401, 403], true)) {
            return 502;
        }

        return ($upstreamStatus >= 400 && $upstreamStatus < 600) ? $upstreamStatus : 502;
    }

    public function render(Request $request): JsonResponse
    {
        $status = self::clientStatus($this->statusCode);

        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'error' => 'microsoft_graph_error',
            'details' => $this->graphError,
        ], $status);
    }
}
