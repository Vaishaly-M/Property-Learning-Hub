<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use App\Services\Microsoft\AdminMicrosoftOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMicrosoftController extends Controller
{
    public function __construct(
        private readonly AdminMicrosoftOAuthService $oauth,
        private readonly AdminMicrosoftGraphService $graph,
    ) {}

    public function status(): JsonResponse
    {
        $connection = \App\Models\AdminMicrosoftConnection::current();
        $status = $this->graph->getConnectionStatus();

        return response()->json([
            'success' => true,
            'connected' => $status['ready'],
            'oauth_connected' => $this->graph->isOAuthConnected(),
            'auth_mode' => config('services.microsoft.auth_mode', 'app_only'),
            'mode' => $status['mode'],
            'ready_for_booking' => $status['ready'],
            'message' => $status['message'],
            'application_roles' => $status['application_roles'],
            'data' => $connection ? [
                'email' => $connection->email,
                'display_name' => $connection->display_name,
                'expires_at' => $connection->expires_at?->toIso8601String(),
            ] : ($status['admin_email'] ? ['email' => $status['admin_email']] : null),
        ]);
    }

    public function connect(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'auth_url' => $this->oauth->getAuthorizationUrl(),
        ]);
    }

    public function callback(Request $request)
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        try {
            $request->validate(['code' => 'required|string', 'state' => 'required|string']);
            $connection = $this->oauth->handleCallback(
                $request->string('code')->toString(),
                $request->string('state')->toString()
            );

            return redirect("{$frontendUrl}/admin/sessions?microsoft_connected=1&email=" . urlencode($connection->email));
        } catch (\Throwable $e) {
            return redirect("{$frontendUrl}/admin/sessions?microsoft_error=" . urlencode($e->getMessage()));
        }
    }

    public function disconnect(): JsonResponse
    {
        $this->oauth->disconnect();

        return response()->json([
            'success' => true,
            'message' => 'Microsoft account disconnected.',
        ]);
    }
}
