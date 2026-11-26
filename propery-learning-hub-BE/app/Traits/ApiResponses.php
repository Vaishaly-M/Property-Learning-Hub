<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponses
{
    protected function success(mixed $data = null, string $message = '', int $code = 200): JsonResponse
    {
        return response()->json(array_filter([
            'success' => true,
            'data'    => $data,
            'message' => $message ?: null,
        ], fn ($v) => $v !== null), $code);
    }

    protected function error(string $message, int $code = 400, mixed $errors = null): JsonResponse
    {
        return response()->json(array_filter([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], fn ($v) => $v !== null), $code);
    }

    protected function forbidden(string $message = 'You do not have permission to perform this action.'): JsonResponse
    {
        return $this->error($message, 403);
    }

    protected function notFound(string $resource = 'Resource'): JsonResponse
    {
        return $this->error("{$resource} not found.", 404);
    }

    protected function validationError($validator): JsonResponse
    {
        return $this->error('Validation failed.', 422, $validator->errors());
    }

    protected function serverError(\Throwable $e): JsonResponse
    {
        report($e);

        return $this->error(
            config('app.debug') ? $e->getMessage() : 'An unexpected error occurred.',
            500
        );
    }
}
