<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MicrosoftAccountNotConnectedException extends Exception
{
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage() ?: 'Microsoft account is not connected.',
            'error' => 'microsoft_not_connected',
        ], 422);
    }
}
