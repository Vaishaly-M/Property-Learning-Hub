<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomField;
use App\Services\DynamicFieldService;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomFieldController extends Controller
{
    use ApiResponses;

    public function __construct(
        private DynamicFieldService $dynamicFieldService
    ) {}

    public function index(Request $request)
    {
        $moduleName = (string) $request->get('module_name', 'contacts');
        return $this->success($this->dynamicFieldService->listFields($moduleName));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'module_name' => 'required|string|max:100',
            'field_name' => 'required|string|max:100',
            'field_key' => 'nullable|string|max:100',
            'field_type' => 'required|string|max:50',
            'validation' => 'nullable|array',
            'field_config' => 'nullable|array',
            'default_value' => 'nullable',
            'required' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'hidden' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'options' => 'nullable|array',
            'options.*.label' => 'nullable|string|max:100',
            'options.*.value' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $field = $this->dynamicFieldService->createField($request->all(), $request->user()?->id);
        return $this->success($field, 'Custom field created.', 201);
    }

    public function update(Request $request, int $id)
    {
        $field = CustomField::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'field_name' => 'sometimes|string|max:100',
            'field_type' => 'sometimes|string|max:50',
            'validation' => 'nullable|array',
            'field_config' => 'nullable|array',
            'default_value' => 'nullable',
            'required' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'hidden' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'options' => 'nullable|array',
            'options.*.label' => 'nullable|string|max:100',
            'options.*.value' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $updated = $this->dynamicFieldService->updateField($field, $request->all());
        return $this->success($updated, 'Custom field updated.');
    }

    public function destroy(int $id)
    {
        $field = CustomField::findOrFail($id);
        $field->delete();

        return $this->success(null, 'Custom field deleted.');
    }
}
