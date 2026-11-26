<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Permissions\UserPermissionBootstrap;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ShinyAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'shiny@globaltechdevelop.com'],
            [
                'first_name'        => 'Shiny',
                'last_name'         => 'Dickson',
                'phone_number'      => '+9999999955',
                'password'          => Hash::make('Diksha@//2002'),
                'role'              => 'admin',
                'status'            => 'active',
            ]
        );

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        UserPermissionBootstrap::ensureUserRoleAndPermissions($user->fresh());

        $this->command->info('✅ Admin: shiny@globaltechdevelop.com / password');
    }
}
