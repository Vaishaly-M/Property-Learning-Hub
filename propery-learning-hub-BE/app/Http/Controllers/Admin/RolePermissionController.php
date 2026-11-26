<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Spatie\Permission\Guard;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    private function permissionGuard(): string
    {
        return Guard::getDefaultName(User::class);
    }

    public function index()
    {
        $guard = $this->permissionGuard();

        $permissions = Permission::query()
            ->where('guard_name', $guard)
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'group' => str_contains($permission->name, '.')
                    ? explode('.', $permission->name)[0]
                    : 'misc',
            ])
            ->values();

        $roles = Role::query()
            ->where('guard_name', $guard)
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'roles' => $roles,
                'permissions' => $permissions,
            ],
        ]);
    }

    public function show(string $role)
    {
        $roleModel = Role::query()
            ->where('name', $role)
            ->where('guard_name', $this->permissionGuard())
            ->with('permissions:id,name')
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $roleModel->id,
                'name' => $roleModel->name,
                'permissions' => $roleModel->permissions->pluck('name')->values(),
            ],
        ]);
    }

    public function update(Request $request, string $role)
    {
        $guard = $this->permissionGuard();

        $roleModel = Role::query()
            ->where('name', $role)
            ->where('guard_name', $guard)
            ->first();

        if (!$roleModel) {
            throw new ModelNotFoundException("Role [{$role}] not found for guard [{$guard}].");
        }

        $validator = Validator::make($request->all(), [
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name,guard_name,' . $guard],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $roleModel->syncPermissions($request->input('permissions', []));

        return response()->json([
            'success' => true,
            'message' => 'Role permissions updated successfully.',
            'data' => [
                'role' => $roleModel->name,
                'permissions' => $roleModel->permissions()->pluck('name')->values(),
            ],
        ]);
    }
}
