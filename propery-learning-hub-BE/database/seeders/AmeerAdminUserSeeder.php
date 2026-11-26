<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Permissions\UserPermissionBootstrap;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AmeerAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'ameer@regalstay.co.uk'],
            [
                'first_name'   => 'Ameer',
                'last_name'    => 'Shah',
                'phone_number' => '+447700900101',
                'password'     => Hash::make('Ameer@2026'),
                'role'         => 'admin',
                'status'       => 'active',
            ]
        );

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        UserPermissionBootstrap::ensureUserRoleAndPermissions($user->fresh());

        $this->command->info('✅ Admin: ameer@regalstay.co.uk / Ameer@2026');
    }
}
