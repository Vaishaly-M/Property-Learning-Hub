<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\User;
use App\Models\Course;
use App\Support\MediaStorage;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class CertificateService
{
    /**
     * Issue a certificate for course completion
     */
    public function issueCertificate(User $user, Course $course, array $metadata = []): ?Certificate
    {
        // Check if certificate already exists
        $existing = Certificate::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();
            
        if ($existing) {
            return $existing;
        }
        
        $certificate = Certificate::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'title' => "Course Completion: {$course->title}",
            'issuer' => config('app.name', 'Property Investment Academy'),
            'description' => "Successfully completed the course '{$course->title}'",
            'verification_code' => Certificate::generateVerificationCode(),
            'issued_at' => now(),
            'expires_at' => null, // Non-expiring
            'metadata' => array_merge([
                'course_title' => $course->title,
                'course_description' => $course->description,
                'completion_date' => now()->toISOString(),
            ], $metadata),
        ]);
        
        // Generate PDF certificate
        $this->generateCertificatePdf($certificate);
        
        return $certificate;
    }
    
    /**
     * Generate PDF for certificate
     */
    public function generateCertificatePdf(Certificate $certificate): void
    {
        try {
            $user = $certificate->user;
            $course = $certificate->course;
            
            $pdf = PDF::loadView('certificates.default', [
                'certificate' => $certificate,
                'user' => $user,
                'course' => $course,
            ]);
            
            $fileName = "certificate-{$certificate->verification_code}.pdf";
            $path = "certificates/{$user->id}/{$fileName}";
            
            // Store PDF
            $content = $pdf->output();
            MediaStorage::storeContent($content, $path, 'public');
            
            // Update certificate with path
            $certificate->certificate_path = $path;
            $certificate->save();
            
        } catch (\Exception $e) {
            Log::error("Failed to generate certificate PDF: {$e->getMessage()}", [
                'certificate_id' => $certificate->id,
            ]);
        }
    }
    
    /**
     * Verify a certificate by verification code
     */
    public function verifyCertificate(string $verificationCode): ?array
    {
        $certificate = Certificate::with(['user'])
            ->where('verification_code', $verificationCode)
            ->first();
            
        if (!$certificate) {
            return null;
        }
        
        return [
            'valid' => true,
            'certificate' => $certificate,
            'user' => $certificate->user,
            'issued_at' => $certificate->issued_at,
        ];
    }
    
    /**
     * Get all certificates for a user
     */
    public function getUserCertificates(User $user): \Illuminate\Database\Eloquent\Collection
    {
        return Certificate::where('user_id', $user->id)
            ->orderBy('issued_at', 'desc')
            ->get();
    }
}