<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Services\Crm\FreesbyLeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FreesbyTemplateLeadController extends Controller
{
    public function __construct(
        private readonly FreesbyLeadService $freesbyLeads,
    ) {}

    /**
     * POST /api/public/freesby/template-request
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'template' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $contact = $this->freesbyLeads->captureTemplateRequest(
            trim($data['full_name']),
            strtolower(trim($data['email'])),
            isset($data['phone']) ? trim($data['phone']) : null,
            trim($data['template']),
        );

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Your template link will be sent shortly.',
            'data' => [
                'contact_id' => $contact->id,
                'classifications' => $contact->classifications->pluck('classification'),
            ],
        ], 201);
    }
}
