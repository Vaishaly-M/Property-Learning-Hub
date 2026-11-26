<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminInfoUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'info@regalstay.co.uk'],
            [
                'first_name'        => 'Andrei',
                'last_name'         => 'Bosancu',
                'phone_number'      => '+9999999944',
                'password'          => Hash::make('password'),
                'role'              => 'admin',
                'status'            => 'active',
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('✅ Admin: admin@test.com / password');
    }
}