<?php

namespace Tests\Feature\Microsoft;

use App\Models\MentorSession;
use App\Models\MentorWorkingHour;
use App\Models\MicrosoftAccount;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MicrosoftTeamsIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $mentor;
    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mentor = User::create([
            'first_name' => 'Mentor',
            'last_name' => 'User',
            'email' => 'mentor-teams@test.com',
            'phone_number' => '+10000001001',
            'password' => bcrypt('password'),
            'role' => 'instructor',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->student = User::create([
            'first_name' => 'Student',
            'last_name' => 'User',
            'email' => 'student-teams@test.com',
            'phone_number' => '+10000001002',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    public function test_mentor_can_get_microsoft_oauth_url(): void
    {
        Sanctum::actingAs($this->mentor);

        $response = $this->getJson('/api/auth/microsoft');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['auth_url']);
    }

    public function test_learner_cannot_get_microsoft_oauth_url(): void
    {
        Sanctum::actingAs($this->student);

        $this->getJson('/api/auth/microsoft')->assertForbidden();
    }

    public function test_microsoft_status_returns_disconnected_when_no_account(): void
    {
        Sanctum::actingAs($this->mentor);

        $response = $this->getJson('/api/auth/microsoft/status');

        $response->assertOk()
            ->assertJsonPath('connected', false)
            ->assertJsonPath('data', null);
    }

    public function test_microsoft_status_returns_connected_account_without_tokens(): void
    {
        MicrosoftAccount::create([
            'user_id' => $this->mentor->id,
            'microsoft_user_id' => 'ms-user-1',
            'email' => 'mentor@outlook.com',
            'display_name' => 'Mentor User',
            'access_token' => 'encrypted-access',
            'refresh_token' => 'encrypted-refresh',
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($this->mentor);

        $response = $this->getJson('/api/auth/microsoft/status');

        $response->assertOk()
            ->assertJsonPath('connected', true)
            ->assertJsonPath('data.email', 'mentor@outlook.com')
            ->assertJsonMissing(['access_token', 'refresh_token']);
    }

    public function test_mentor_can_disconnect_microsoft_account(): void
    {
        MicrosoftAccount::create([
            'user_id' => $this->mentor->id,
            'microsoft_user_id' => 'ms-user-1',
            'email' => 'mentor@outlook.com',
            'display_name' => 'Mentor User',
            'access_token' => 'encrypted-access',
            'refresh_token' => 'encrypted-refresh',
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($this->mentor);

        $this->postJson('/api/auth/microsoft/disconnect')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('microsoft_accounts', ['user_id' => $this->mentor->id]);
    }

    public function test_availability_returns_slots_for_mentor_with_working_hours(): void
    {
        $this->seedWorkingHours($this->mentor);

        Sanctum::actingAs($this->student);

        $date = Carbon::now('UTC')->next(Carbon::MONDAY)->toDateString();

        $response = $this->getJson('/api/sessions/availability?' . http_build_query([
            'mentor_id' => $this->mentor->id,
            'date' => $date,
            'timezone' => 'UTC',
        ]));

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['slots']]);

        $slots = $response->json('data.slots');
        $this->assertNotEmpty($slots);
        $this->assertArrayHasKey('start', $slots[0]);
        $this->assertArrayHasKey('end', $slots[0]);
    }

    public function test_student_can_list_their_sessions(): void
    {
        $session = $this->createSession();

        Sanctum::actingAs($this->student);

        $this->getJson('/api/sessions')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $session->id);
    }

    public function test_student_can_view_session_details(): void
    {
        $session = $this->createSession();

        Sanctum::actingAs($this->student);

        $this->getJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('data.join_url', 'https://teams.microsoft.com/join/test')
            ->assertJsonPath('data.mentor.email', $this->mentor->email);
    }

    public function test_student_cannot_cancel_session(): void
    {
        $session = $this->createSession();

        Sanctum::actingAs($this->student);

        $this->deleteJson("/api/sessions/{$session->id}")
            ->assertForbidden();
    }

    public function test_mentor_can_cancel_session(): void
    {
        $session = $this->createSession();

        Sanctum::actingAs($this->mentor);

        $this->deleteJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('mentor_sessions', [
            'id' => $session->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_booking_conflict_returns_409(): void
    {
        $start = Carbon::now('UTC')->addDays(2)->setTime(10, 0);
        $end = $start->copy()->addMinutes(30);

        $this->createSession($start, $end);

        Sanctum::actingAs($this->mentor);

        $this->postJson('/api/sessions', [
            'student_id' => $this->student->id,
            'subject' => 'Duplicate Session',
            'start_time' => $start->toIso8601String(),
            'end_time' => $end->toIso8601String(),
            'timezone' => 'UTC',
        ])->assertStatus(409)
            ->assertJsonPath('error', 'booking_conflict');
    }

    private function seedWorkingHours(User $mentor): void
    {
        foreach (range(1, 5) as $day) {
            MentorWorkingHour::create([
                'mentor_id' => $mentor->id,
                'day_of_week' => $day,
                'start_time' => '09:00:00',
                'end_time' => '17:00:00',
                'timezone' => 'UTC',
                'is_active' => true,
            ]);
        }
    }

    private function createSession(?Carbon $start = null, ?Carbon $end = null): MentorSession
    {
        $start ??= Carbon::now('UTC')->addDays(3)->setTime(10, 0);
        $end ??= $start->copy()->addMinutes(30);

        return MentorSession::create([
            'mentor_id' => $this->mentor->id,
            'student_id' => $this->student->id,
            'event_id' => 'event-1',
            'meeting_id' => 'meeting-1',
            'join_url' => 'https://teams.microsoft.com/join/test',
            'subject' => 'Test Session',
            'description' => 'Test description',
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'scheduled',
            'timezone' => 'UTC',
        ]);
    }
}
