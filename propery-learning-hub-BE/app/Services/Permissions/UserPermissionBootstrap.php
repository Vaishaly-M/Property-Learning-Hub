<?php

namespace App\Services\Permissions;

use App\Models\User;
use Database\Seeders\ChatPermissionSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserPermissionBootstrap
{
    public static function ensureChatPermissionsConfigured(): void
    {
        $hasPermissions = Permission::whereIn('name', ChatPermissionSeeder::PERMISSIONS)->count();
        if ($hasPermissions === count(ChatPermissionSeeder::PERMISSIONS)) {
            return;
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (ChatPermissionSeeder::PERMISSIONS as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $learnerPermissions = [
            'chat.view', 'chat.send', 'chat.receive', 'chat.delete',
            'group_chat.view', 'group_chat.send', 'group_chat.receive',
            'chat.file.upload', 'chat.file.download',
            'chat.audio.send', 'chat.audio.receive',
            'chat.notification.view',
        ];

        $instructorPermissions = array_merge($learnerPermissions, [
            'group_chat.create', 'group_chat.edit', 'group_chat.add_member', 'group_chat.remove_member',
        ]);

        self::syncRolePermissions('learner', $learnerPermissions);
        self::syncRolePermissions('instructor', $instructorPermissions);
        self::syncRolePermissions('admin', ChatPermissionSeeder::PERMISSIONS);
    }

    public static function ensureUserRoleAndPermissions(User $user): void
    {
        if (!$user->role) {
            return;
        }

        self::ensureChatPermissionsConfigured();

        $user->syncRoles([$user->role]);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private static function syncRolePermissions(string $roleName, array $permissions): void
    {
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);
    }
}
