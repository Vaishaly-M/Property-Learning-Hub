<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\InfinitWizardSsoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Admin / instructor InfinitWizard SSO — same VIP + Passport flow as learners,
 * so Active Features (Invoice / CRM / InfinitDoc) work from the admin sidebar.
 */
class InfinitWizardController extends Controller
{
    public function __construct(
        private readonly InfinitWizardSsoService $infinitWizardSsoService,
    ) {}

    /**
     * POST /api/admin/infinitwizard/sso
     */
    public function sso(): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        try {
            $result = $this->infinitWizardSsoService->launch([
                'email' => (string) $user->email,
                'first_name' => (string) ($user->first_name ?? ''),
                'last_name' => (string) ($user->last_name ?? ''),
                'phone_number' => $user->phone_number ?? null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Opening InfinitWizard…',
                'data' => $result,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            Log::error('Admin InfinitWizard SSO error', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to open InfinitWizard. Please try again later.',
            ], 500);
        }
    }
}
