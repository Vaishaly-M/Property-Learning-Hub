<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Microsoft\ConnectMicrosoftAccountRequest;
use App\Http\Resources\MicrosoftAccountResource;
use App\Repositories\MicrosoftAccountRepository;
use App\Services\Microsoft\MicrosoftOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MicrosoftAuthController extends Controller
{
    public function __construct(
        private readonly MicrosoftOAuthService $oauth,
        private readonly MicrosoftAccountRepository $accounts,
    ) {}

    /**
     * GET /api/auth/microsoft
     * Returns Microsoft OAuth authorization URL for the authenticated mentor.
     */
    public function redirect(ConnectMicrosoftAccountRequest $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'auth_url' => $this->oauth->getAuthorizationUrl($user->id),
        ]);
    }

    /**
     * GET /api/auth/microsoft/callback
     * Public OAuth callback — exchanges code and stores tokens.
     */
    public function callback(Request $request)
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        try {
            $request->validate([
                'code' => 'required|string',
                'state' => 'required|string',
            ]);

            $account = $this->oauth->handleCallback(
                $request->string('code')->toString(),
                $request->string('state')->toString()
            );

            return redirect("{$frontendUrl}/auth/microsoft/callback?connected=1&email=" . urlencode($account->email));
        } catch (\Throwable $e) {
            return redirect("{$frontendUrl}/auth/microsoft/callback?error=" . urlencode($e->getMessage()));
        }
    }

    /**
     * GET /api/auth/microsoft/status
     */
    public function status(Request $request): JsonResponse
    {
        $account = $this->accounts->findByUserId($request->user()->id);

        if (!$account) {
            return response()->json([
                'success' => true,
                'connected' => false,
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => new MicrosoftAccountResource($account),
        ]);
    }

    /**
     * POST /api/auth/microsoft/disconnect
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isInstructor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only mentors can disconnect Microsoft accounts.',
            ], 403);
        }

        $this->accounts->deleteForUser($user);

        return response()->json([
            'success' => true,
            'message' => 'Microsoft account disconnected successfully.',
        ]);
    }
}
