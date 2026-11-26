<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Meetings\StoreAvailabilityBlockRequest;
use App\Models\AdminAvailabilityBlock;
use Illuminate\Http\JsonResponse;

class AdminAvailabilityBlockController extends Controller
{
    public function index(): JsonResponse
    {
        $blocks = AdminAvailabilityBlock::orderBy('start_time')->get();

        return response()->json(['success' => true, 'data' => $blocks]);
    }

    public function store(StoreAvailabilityBlockRequest $request): JsonResponse
    {
        $block = AdminAvailabilityBlock::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Time block created.',
            'data' => $block,
        ], 201);
    }

    public function destroy(AdminAvailabilityBlock $block): JsonResponse
    {
        $block->delete();

        return response()->json([
            'success' => true,
            'message' => 'Time block removed.',
        ]);
    }
}
