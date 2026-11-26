<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Permissions\UserPermissionBootstrap;
use Illuminate\Database\Seeder;

class ChatPermissionSeeder extends Seeder
{
    public const PERMISSIONS = [
        'chat.view',
        'chat.send',
        'chat.receive',
        'chat.delete',
        'group_chat.view',
        'group_chat.send',
        'group_chat.receive',
        'group_chat.create',
        'group_chat.edit',
        'group_chat.delete',
        'group_chat.add_member',
        'group_chat.remove_member',
        'chat.file.upload',
        'chat.file.download',
        'chat.audio.send',
        'chat.audio.receive',
        'chat.notification.view',
    ];

    public function run(): void
    {
        UserPermissionBootstrap::ensureChatPermissionsConfigured();

        User::query()->each(function (User $user) {
            if (!$user->role) {
                return;
            }
            UserPermissionBootstrap::ensureUserRoleAndPermissions($user);
        });

        $this->command->info('✅ Chat permissions seeded and assigned to roles.');
    }
}
