<?php

namespace Tests\Unit\Microsoft;

use App\Models\MentorWorkingHour;
use App\Models\User;
use App\Repositories\SessionRepository;
use App\Services\Microsoft\AvailabilityService;
use App\Services\Microsoft\MicrosoftGraphService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AvailabilityServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_generates_thirty_minute_slots_minus_busy_periods(): void
    {
        $mentor = User::create([
            'first_name' => 'Mentor',
            'last_name' => 'User',
            'email' => 'availability@test.com',
            'phone_number' => '+10000002001',
            'password' => bcrypt('password'),
            'role' => 'instructor',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $monday = Carbon::parse('next monday', 'UTC');

        MentorWorkingHour::create([
            'mentor_id' => $mentor->id,
            'day_of_week' => $monday->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        $graph = Mockery::mock(MicrosoftGraphService::class);
        $graph->shouldReceive('getSchedule')->andReturn([
            [
                'status' => 'busy',
                'start' => ['dateTime' => $monday->format('Y-m-d') . 'T10:00:00'],
                'end' => ['dateTime' => $monday->format('Y-m-d') . 'T11:00:00'],
            ],
            [
                'status' => 'busy',
                'start' => ['dateTime' => $monday->format('Y-m-d') . 'T14:00:00'],
                'end' => ['dateTime' => $monday->format('Y-m-d') . 'T15:00:00'],
            ],
        ]);

        $service = new AvailabilityService($graph, new SessionRepository());

        Carbon::setTestNow($monday->copy()->setTime(8, 0));

        $slots = $service->getAvailableSlots($mentor, $monday->copy()->startOfDay(), 'UTC');

        $labels = array_column($slots, 'label');

        $this->assertContains('09:00 - 09:30', $labels);
        $this->assertContains('11:00 - 11:30', $labels);
        $this->assertContains('13:30 - 14:00', $labels);
        $this->assertContains('15:00 - 15:30', $labels);
        $this->assertNotContains('10:00 - 10:30', $labels);
        $this->assertNotContains('14:00 - 14:30', $labels);

        Carbon::setTestNow();
    }
}
