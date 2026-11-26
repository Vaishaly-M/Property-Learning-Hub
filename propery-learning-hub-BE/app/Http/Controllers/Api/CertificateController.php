<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Services\CertificateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CertificateController extends Controller
{
    protected CertificateService $certificateService;

    public function __construct(CertificateService $certificateService)
    {
        $this->certificateService = $certificateService;
    }

    /**
     * Get user's certificates
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $certificates = $this->certificateService->getUserCertificates($user);
        
        return response()->json([
            'success' => true,
            'data' => $certificates->map(function ($cert) {
                return [
                    'id' => $cert->id,
                    'title' => $cert->title,
                    'issuer' => $cert->issuer,
                    'description' => $cert->description,
                    'issueDate' => $cert->issued_at->format('Y-m-d'),
                    'verificationCode' => $cert->verification_code,
                    'downloadUrl' => $cert->download_url,
                ];
            }),
        ]);
    }

    /**
     * Verify a certificate
     */
    public function verify(string $code): JsonResponse
    {
        $result = $this->certificateService->verifyCertificate($code);
        
        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Certificate not found or invalid',
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Download certificate PDF
     */
    public function download(string $code)
    {
        $certificate = Certificate::where('verification_code', $code)
            ->with('user')
            ->first();
            
        if (!$certificate) {
            abort(404, 'Certificate not found');
        }
        
        // Check if user is authorized (only the certificate owner can download)
        if ($certificate->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }
        
        if (!$certificate->certificate_path) {
            abort(404, 'Certificate file not found');
        }
        
        return MediaStorage::download(
            $certificate->certificate_path,
            "certificate-{$certificate->verification_code}.pdf",
            'application/pdf',
            false // Not private (publicly accessible with token)
        );
    }
}