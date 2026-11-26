<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Http\Controllers\Controller;
use App\Models\CrmWorkflowRule;
use Illuminate\Http\Request;

class CrmWorkflowRuleController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data'    => CrmWorkflowRule::orderByDesc('priority')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'trigger_event'  => 'required|string|max:100',
            'conditions'     => 'nullable|array',
            'actions'        => 'required|array',
            'is_active'      => 'nullable|boolean',
            'priority'       => 'nullable|integer|min:0',
        ]);

        $rule = CrmWorkflowRule::create([
            ...$data,
            'is_active' => $data['is_active'] ?? true,
            'priority'  => $data['priority'] ?? 0,
        ]);

        return response()->json(['success' => true, 'data' => $rule], 201);
    }

    public function update(Request $request, CrmWorkflowRule $workflowRule)
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'trigger_event'  => 'sometimes|string|max:100',
            'conditions'     => 'nullable|array',
            'actions'        => 'sometimes|array',
            'is_active'      => 'nullable|boolean',
            'priority'       => 'nullable|integer|min:0',
        ]);

        $workflowRule->update($data);

        return response()->json(['success' => true, 'data' => $workflowRule->fresh()]);
    }

    public function destroy(CrmWorkflowRule $workflowRule)
    {
        $workflowRule->delete();

        return response()->json(['success' => true, 'message' => 'Workflow rule deleted']);
    }
}
