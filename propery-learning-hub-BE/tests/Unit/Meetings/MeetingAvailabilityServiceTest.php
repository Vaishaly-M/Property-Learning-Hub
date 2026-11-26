<?php

namespace Tests\Unit\Meetings;

use App\DTOs\AvailabilityQueryDTO;
use App\Models\AdminAvailabilityBlock;
use App\Models\AvailabilitySetting;
use App\Models\PlatformMeeting;
use App\Repositories\AvailabilitySettingRepository;
use App\Repositories\PlatformMeetingRepository;
use App\Services\Meetings\MeetingAvailabilityService;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class MeetingAvailabilityServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('availability_settings', function (Blueprint $table) {
            $table->id();
            $table->time('working_hours_start')->default('09:00:00');
            $table->time('working_hours_end')->default('17:00:00');
            $table->time('lunch_break_start')->nullable();
            $table->time('lunch_break_end')->nullable();
            $table->unsignedSmallInteger('slot_duration')->default(30);
            $table->string('timezone')->default('Europe/London');
            $table->timestamps();
        });

        Schema::create('admin_availability_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('platform_meetings', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('status');
            $table->string('event_id')->nullable();
            $table->string('manage_token')->nullable();
            $table->string('organizer_email')->nullable();
            $table->timestamps();
        });

        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->time('time');
            $table->integer('duration')->nullable();
            $table->string('status');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('meetings');
        Schema::dropIfExists('platform_meetings');
        Schema::dropIfExists('admin_availability_blocks');
        Schema::dropIfExists('availability_settings');
        Mockery::close();
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_slots_remain_before_partial_day_block(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-16 09:00:00', 'Europe/London'));

        AvailabilitySetting::create([
            'working_hours_start' => '10:00:00',
            'working_hours_end' => '17:00:00',
            'slot_duration' => 30,
            'timezone' => 'Europe/London',
        ]);

        $block = AdminAvailabilityBlock::create([
            'start_time' => Carbon::parse('2026-06-24 14:30:00', 'Europe/London')->utc(),
            'end_time' => Carbon::parse('2026-06-25 22:30:00', 'Europe/London')->utc(),
            'reason' => 'testing reason',
        ]);

        $this->assertSame(
            '14:30',
            Carbon::parse($block->fresh()->getRawOriginal('start_time'), 'UTC')->timezone('Europe/London')->format('H:i')
        );

        $service = $this->makeService();

        $slots = $service->getAvailableSlots(
            new AvailabilityQueryDTO(
                Carbon::parse('2026-06-24', 'Europe/London'),
                'Europe/London'
            )
        );

        $this->assertNotEmpty($slots);
        $this->assertSame('10:00 - 10:30', $slots[0]['label']);
        $this->assertSame('14:00 - 14:30', $slots[array_key_last($slots)]['label']);
        $this->assertCount(9, $slots);
        $this->assertFalse(collect($slots)->contains(fn ($s) => str_starts_with($s['label'], '14:30')));
    }

    public function test_future_day_slots_are_not_filtered_out(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-16 09:00:00', 'Europe/London'));

        AvailabilitySetting::create([
            'working_hours_start' => '10:00:00',
            'working_hours_end' => '17:00:00',
            'slot_duration' => 30,
            'timezone' => 'Europe/London',
        ]);

        $service = $this->makeService();

        $slots = $service->getAvailableSlots(
            new AvailabilityQueryDTO(
                Carbon::parse('2026-06-24', 'Europe/London'),
                'Europe/London'
            )
        );

        $this->assertCount(14, $slots);
    }

    public function test_free_outlook_events_do_not_block_slots(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-16 09:00:00', 'Europe/London'));

        AvailabilitySetting::create([
            'working_hours_start' => '10:00:00',
            'working_hours_end' => '17:00:00',
            'slot_duration' => 30,
            'timezone' => 'Europe/London',
        ]);

        $graph = Mockery::mock(AdminMicrosoftGraphService::class);
        $graph->shouldReceive('getSchedule')->andReturn([
            ['start' => ['dateTime' => '2026-06-24T10:00:00', 'timeZone' => 'GMT Standard Time'], 'end' => ['dateTime' => '2026-06-24T17:00:00', 'timeZone' => 'GMT Standard Time'], 'status' => ''],
        ]);
        $graph->shouldReceive('getCalendarEvents')->andReturn([
            [
                'start' => ['dateTime' => '2026-06-24T10:00:00', 'timeZone' => 'GMT Standard Time'],
                'end' => ['dateTime' => '2026-06-24T17:00:00', 'timeZone' => 'GMT Standard Time'],
                'showAs' => 'free',
            ],
        ]);

        $service = new MeetingAvailabilityService(
            $graph,
            new PlatformMeetingRepository(),
            new AvailabilitySettingRepository(),
        );

        $slots = $service->getAvailableSlots(
            new AvailabilityQueryDTO(
                Carbon::parse('2026-06-24', 'Europe/London'),
                'Europe/London'
            )
        );

        $this->assertCount(14, $slots);
    }

    public function test_cancelled_platform_meeting_frees_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-16 09:00:00', 'Europe/London'));

        AvailabilitySetting::create([
            'working_hours_start' => '10:00:00',
            'working_hours_end' => '17:00:00',
            'slot_duration' => 30,
            'timezone' => 'Europe/London',
        ]);

        PlatformMeeting::create([
            'start_time' => Carbon::parse('2026-06-24 10:00:00', 'Europe/London')->utc(),
            'end_time' => Carbon::parse('2026-06-24 10:30:00', 'Europe/London')->utc(),
            'status' => 'cancelled',
            'event_id' => 'evt-cancelled-1',
        ]);

        $graph = Mockery::mock(AdminMicrosoftGraphService::class);
        $graph->shouldReceive('getSchedule')->andReturn([]);
        $graph->shouldReceive('getCalendarEvents')->andReturn([
            [
                'id' => 'evt-cancelled-1',
                'start' => ['dateTime' => '2026-06-24T10:00:00', 'timeZone' => 'GMT Standard Time'],
                'end' => ['dateTime' => '2026-06-24T10:30:00', 'timeZone' => 'GMT Standard Time'],
                'showAs' => 'busy',
            ],
        ]);

        $service = new MeetingAvailabilityService(
            $graph,
            new PlatformMeetingRepository(),
            new AvailabilitySettingRepository(),
        );

        $slots = $service->getAvailableSlots(
            new AvailabilityQueryDTO(
                Carbon::parse('2026-06-24', 'Europe/London'),
                'Europe/London'
            )
        );

        $this->assertTrue(collect($slots)->contains(fn ($slot) => $slot['label'] === '10:00 - 10:30'));
    }

    public function test_rescheduled_platform_meeting_frees_old_outlook_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-16 09:00:00', 'Europe/London'));

        AvailabilitySetting::create([
            'working_hours_start' => '10:00:00',
            'working_hours_end' => '17:00:00',
            'slot_duration' => 30,
            'timezone' => 'Europe/London',
        ]);

        PlatformMeeting::create([
            'start_time' => Carbon::parse('2026-06-24 14:00:00', 'Europe/London')->utc(),
            'end_time' => Carbon::parse('2026-06-24 14:30:00', 'Europe/London')->utc(),
            'status' => 'rescheduled',
            'event_id' => 'evt-rescheduled-1',
        ]);

        $graph = Mockery::mock(AdminMicrosoftGraphService::class);
        $graph->shouldReceive('getSchedule')->andReturn([]);
        $graph->shouldReceive('getCalendarEvents')->andReturn([
            [
                'id' => 'evt-rescheduled-1',
                'start' => ['dateTime' => '2026-06-24T10:00:00', 'timeZone' => 'GMT Standard Time'],
                'end' => ['dateTime' => '2026-06-24T10:30:00', 'timeZone' => 'GMT Standard Time'],
                'showAs' => 'busy',
            ],
        ]);

        $service = new MeetingAvailabilityService(
            $graph,
            new PlatformMeetingRepository(),
            new AvailabilitySettingRepository(),
        );

        $slots = $service->getAvailableSlots(
            new AvailabilityQueryDTO(
                Carbon::parse('2026-06-24', 'Europe/London'),
                'Europe/London'
            )
        );

        $this->assertTrue(collect($slots)->contains(fn ($slot) => $slot['label'] === '10:00 - 10:30'));
    }

    public function test_active_platform_meeting_blocks_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-16 09:00:00', 'Europe/London'));

        AvailabilitySetting::create([
            'working_hours_start' => '10:00:00',
            'working_hours_end' => '17:00:00',
            'slot_duration' => 30,
            'timezone' => 'Europe/London',
        ]);

        PlatformMeeting::create([
            'start_time' => Carbon::parse('2026-06-24 13:00:00', 'UTC'),
            'end_time' => Carbon::parse('2026-06-24 13:30:00', 'UTC'),
            'status' => 'scheduled',
        ]);

        $service = $this->makeService();

        $slots = $service->getAvailableSlots(
            new AvailabilityQueryDTO(
                Carbon::parse('2026-06-24', 'Europe/London'),
                'Europe/London'
            )
        );

        $this->assertFalse(collect($slots)->contains(fn ($slot) => $slot['label'] === '14:00 - 14:30'));
    }

    private function makeService(): MeetingAvailabilityService
    {
        $graph = Mockery::mock(AdminMicrosoftGraphService::class);
        $graph->shouldReceive('getSchedule')->andReturn([]);
        $graph->shouldReceive('getCalendarEvents')->andReturn([]);

        return new MeetingAvailabilityService(
            $graph,
            new PlatformMeetingRepository(),
            new AvailabilitySettingRepository(),
        );
    }
}
