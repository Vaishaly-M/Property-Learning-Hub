<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FreesbyTemplateDownload; // Changed from TemplateDownload
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class FreesbyTemplateController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'template_name' => 'required|string|max:255',
            'template_slug' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $download = FreesbyTemplateDownload::create([ // Changed from TemplateDownload
                'full_name' => $request->full_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'template_name' => $request->template_name,
                'template_slug' => $request->template_slug,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            Log::info('Template access requested', [
                'template' => $request->template_name,
                'email' => $request->email,
                'id' => $download->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Template access recorded successfully',
                'data' => [
                    'id' => $download->id,
                    'template_name' => $download->template_name,
                    'email' => $download->email,
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error recording template access: ' . $e->getMessage(), [
                'request' => $request->all(),
                'error' => $e
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your request'
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $downloads = FreesbyTemplateDownload::orderBy('created_at', 'desc') // Changed from TemplateDownload
            ->when($request->search, function ($query, $search) {
                return $query->where('full_name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%")
                    ->orWhere('template_name', 'LIKE', "%{$search}%");
            })
            ->when($request->template, function ($query, $template) {
                return $query->where('template_name', $template);
            })
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $downloads
        ]);
    }

    public function stats()
    {
        $stats = [
            'total_downloads' => FreesbyTemplateDownload::count(), // Changed from TemplateDownload
            'unique_emails' => FreesbyTemplateDownload::distinct('email')->count('email'), // Changed from TemplateDownload
            'templates' => FreesbyTemplateDownload::selectRaw('template_name, COUNT(*) as count') // Changed from TemplateDownload
                ->groupBy('template_name')
                ->orderByDesc('count')
                ->get(),
            'daily_stats' => FreesbyTemplateDownload::selectRaw('DATE(created_at) as date, COUNT(*) as count') // Changed from TemplateDownload
                ->groupBy('date')
                ->orderByDesc('date')
                ->limit(30)
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}