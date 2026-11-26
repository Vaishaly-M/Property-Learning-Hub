<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // ── Learner ──────────────────────────────────────────────
        $learner = User::updateOrCreate(
            [
                'email'        => 'learner@test.com',
                'phone_number' => '+1234567870',
            ],
            [
                'first_name'        => 'John',
                'last_name'         => 'Learner',
                'password'          => Hash::make('password'),
                'role'              => 'learner',
                'status'            => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (!$learner->learnerProfile) {
            $learner->learnerProfile()->create([
                'subscription_plan' => 'free',
                'billing_cycle'     => 'monthly',
                'profile_completed' => false,
            ]);
        }

        $this->command->info('✅ Learner: learner@test.com / password');

        // ── Instructor ───────────────────────────────────────────
        $instructor = User::updateOrCreate(
            [
                'email'        => 'instructor@test.com',
                'phone_number' => '+1234567891',
            ],
            [
                'first_name'        => 'Jane',
                'last_name'         => 'Instructor',
                'password'          => Hash::make('password'),
                'role'              => 'instructor',
                'status'            => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (!$instructor->instructorProfile) {
            $instructor->instructorProfile()->create([
                'instructor_plan'   => 'free',
                'billing_cycle'     => 'monthly',
                'profile_completed' => false,
            ]);
        }

        $this->command->info('✅ Instructor: instructor@test.com / password');

        // ── Admin & other seeders ────────────────────────────────
        $this->call([
            AdminUserSeeder::class,
            ChatPermissionSeeder::class,
            AdminInfoUserSeeder::class,
            ShinyAdminUserSeeder::class,
            AmeerAdminUserSeeder::class,
            //ContentCategoriesSeeder::class,
        ]);
    }
}