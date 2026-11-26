<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_verification_activates_pending_user(): void
    {
        $user = User::create([
            'first_name' => 'New',
            'last_name' => 'Learner',
            'email' => 'new-learner@test.com',
            'phone_number' => '+10000000099',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'pending',
        ]);

        $hash = sha1($user->getEmailForVerification());

        $response = $this->postJson('/api/email/verify', [
            'id' => $user->id,
            'hash' => $hash,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.status', 'active');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => 'active',
        ]);

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_email_verification_does_not_change_suspended_user_status(): void
    {
        $user = User::create([
            'first_name' => 'Suspended',
            'last_name' => 'Learner',
            'email' => 'suspended-learner@test.com',
            'phone_number' => '+10000000100',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'suspended',
        ]);

        $hash = sha1($user->getEmailForVerification());

        $response = $this->postJson('/api/email/verify', [
            'id' => $user->id,
            'hash' => $hash,
        ]);

        $response->assertOk()
            ->assertJsonPath('user.status', 'suspended');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => 'suspended',
        ]);
    }
}
