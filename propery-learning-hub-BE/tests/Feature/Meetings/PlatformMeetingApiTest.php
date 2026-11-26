<?php

namespace Tests\Feature\Meetings;

use App\Models\PlatformMeeting;
use App\Models\User;
use App\Services\Meetings\MeetingAvailabilityService;
use App\Services\Meetings\MeetingBookingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class PlatformMeetingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_public_availability_endpoint_returns_slots(): void
    {
        $mock = Mockery::mock(MeetingAvailabilityService::class);
        $mock->shouldReceive('getAvailableSlots')->andReturn([
            ['start' => '2026-06-20T09:00:00+12:00', 'end' => '2026-06-20T09:30:00+12:00', 'label' => '09:00 - 09:30'],
        ]);
        $this->app->instance(MeetingAvailabilityService::class, $mock);

        $response = $this->getJson('/api/availability?date=2026-06-20&timezone=Europe/London');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['slots']]);
    }

    public function test_authenticated_user_can_list_their_meetings(): void
    {
        $user = User::create([
            'first_name' => 'Learner',
            'last_name' => 'User',
            'email' => 'learner-meeting@test.com',
            'phone_number' => '+10000003001',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        PlatformMeeting::create([
            'user_id' => $user->id,
            'name' => 'Learner User',
            'email' => $user->email,
            'meeting_type' => 'strategy_call',
            'start_time' => now()->addDay(),
            'end_time' => now()->addDay()->addMinutes(30),
            'status' => 'scheduled',
            'timezone' => 'Europe/London',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/my-meetings')
            ->assertOk()
            ->assertJsonPath('data.0.email', $user->email);
    }

    public function test_participant_email_can_list_meeting_they_were_invited_to(): void
    {
        $admin = User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin-participant@test.com',
            'phone_number' => '+10000003002',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $learner = User::create([
            'first_name' => 'Invited',
            'last_name' => 'Learner',
            'email' => 'invited-learner@test.com',
            'phone_number' => '+10000003003',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        PlatformMeeting::create([
            'user_id' => $admin->id,
            'name' => 'Super Admin',
            'email' => $admin->email,
            'participants' => [
                ['name' => 'Invited Learner', 'email' => $learner->email],
            ],
            'meeting_type' => 'property_consultation',
            'start_time' => now()->addDays(2),
            'end_time' => now()->addDays(2)->addMinutes(30),
            'status' => 'scheduled',
            'timezone' => 'Europe/London',
        ]);

        Sanctum::actingAs($learner);

        $this->getJson('/api/my-meetings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.meeting_type', 'property_consultation')
            ->assertJsonPath('data.0.all_participants.1.email', $learner->email);
    }

    public function test_booking_conflict_returns_409(): void
    {
        $start = Carbon::now('UTC')->addDays(3)->setTime(10, 0);
        $end = $start->copy()->addMinutes(30);

        PlatformMeeting::create([
            'name' => 'Busy',
            'email' => 'busy@test.com',
            'meeting_type' => 'strategy_call',
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'scheduled',
            'timezone' => 'UTC',
        ]);

        $booking = Mockery::mock(MeetingBookingService::class);
        $booking->shouldReceive('book')->andThrow(new \App\Exceptions\BookingConflictException('Conflict'));
        $this->app->instance(MeetingBookingService::class, $booking);

        $this->postJson('/api/book-meeting', [
            'name' => 'Visitor',
            'email' => 'visitor@test.com',
            'meeting_type' => 'strategy_call',
            'start_time' => $start->toIso8601String(),
            'end_time' => $end->toIso8601String(),
            'timezone' => 'UTC',
        ])->assertStatus(409);
    }
}
