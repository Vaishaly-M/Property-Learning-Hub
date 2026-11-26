<?php

namespace Tests\Unit\Crm;

use App\Models\Contact;
use App\Models\PlatformMeeting;
use App\Models\User;
use App\Services\Crm\PlatformMeetingCrmSyncService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PlatformMeetingCrmSyncServiceTest extends TestCase
{
    private PlatformMeetingCrmSyncService $sync;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone_number')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('learner');
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('contact_ref')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable()->index();
            $table->string('phone_number')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('active');
            $table->foreignId('user_id')->nullable();
            $table->foreignId('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('contact_classifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id');
            $table->string('classification');
            $table->timestamps();
        });

        Schema::create('contact_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id');
            $table->string('activity_type');
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('performed_by')->nullable();
            $table->timestamp('happened_at')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_workflow_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('trigger_event');
            $table->json('conditions')->nullable();
            $table->json('actions')->nullable();
            $table->unsignedInteger('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('platform_meetings', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->nullable();
            $table->foreignId('user_id')->nullable();
            $table->string('booking_type')->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->json('participants')->nullable();
            $table->string('meeting_type');
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('status')->default('scheduled');
            $table->string('timezone')->default('Europe/London');
            $table->string('manage_token')->nullable();
            $table->string('organizer_email')->nullable();
            $table->timestamps();
        });

        $this->sync = app(PlatformMeetingCrmSyncService::class);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('platform_meetings');
        Schema::dropIfExists('crm_workflow_rules');
        Schema::dropIfExists('contact_activities');
        Schema::dropIfExists('contact_classifications');
        Schema::dropIfExists('contacts');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function test_discovery_call_booking_creates_crm_contact_and_activity(): void
    {
        $meeting = $this->createMeeting([
            'name' => 'Alex Prospect',
            'email' => 'alex.prospect@test.com',
            'phone' => '+441234567890',
            'meeting_type' => 'discovery_call',
        ]);

        $this->sync->syncBooking($meeting);

        $this->assertDatabaseHas('contacts', [
            'email' => 'alex.prospect@test.com',
            'first_name' => 'Alex',
            'last_name' => 'Prospect',
            'phone_number' => '+441234567890',
        ]);

        $contact = Contact::where('email', 'alex.prospect@test.com')->first();
        $this->assertNotNull($contact);

        $this->assertDatabaseHas('contact_activities', [
            'contact_id' => $contact->id,
            'activity_type' => 'coaching_session',
            'title' => 'Discovery call booked',
        ]);

        $this->assertDatabaseHas('contact_classifications', [
            'contact_id' => $contact->id,
            'classification' => 'lead',
        ]);
        $this->assertDatabaseHas('contact_classifications', [
            'contact_id' => $contact->id,
            'classification' => 'enquiry',
        ]);
    }

    public function test_booking_links_existing_platform_user_to_crm_contact(): void
    {
        $user = User::create([
            'first_name' => 'Registered',
            'last_name' => 'Learner',
            'email' => 'registered.learner@test.com',
            'phone_number' => '+441111111111',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $meeting = $this->createMeeting([
            'user_id' => $user->id,
            'name' => 'Registered Learner',
            'email' => $user->email,
            'phone' => $user->phone_number,
            'meeting_type' => 'discovery_call',
        ]);

        $this->sync->syncBooking($meeting);

        $contact = Contact::where('user_id', $user->id)->first();
        $this->assertNotNull($contact);
        $this->assertSame('registered.learner@test.com', $contact->email);
    }

    public function test_participants_receive_separate_crm_activities(): void
    {
        $meeting = $this->createMeeting([
            'name' => 'Primary Booker',
            'email' => 'primary@test.com',
            'meeting_type' => 'discovery_call',
            'participants' => [
                ['name' => 'Guest Participant', 'email' => 'guest@test.com'],
            ],
        ]);

        $this->sync->syncBooking($meeting);

        $this->assertDatabaseHas('contacts', ['email' => 'primary@test.com']);
        $this->assertDatabaseHas('contacts', ['email' => 'guest@test.com']);

        $primary = Contact::where('email', 'primary@test.com')->first();
        $guest = Contact::where('email', 'guest@test.com')->first();

        $this->assertDatabaseHas('contact_activities', [
            'contact_id' => $primary->id,
            'title' => 'Discovery call booked',
        ]);
        $this->assertDatabaseHas('contact_activities', [
            'contact_id' => $guest->id,
            'title' => 'Discovery call booked',
        ]);
    }

    public function test_property_consultation_is_not_synced_to_crm(): void
    {
        $meeting = $this->createMeeting([
            'name' => 'Consult Only',
            'email' => 'consult@test.com',
            'meeting_type' => 'property_consultation',
        ]);

        $this->sync->syncBooking($meeting);

        $this->assertDatabaseMissing('contacts', ['email' => 'consult@test.com']);
    }

    public function test_reschedule_logs_activity_without_duplicating_booking(): void
    {
        $meeting = $this->createMeeting([
            'name' => 'Reschedule Me',
            'email' => 'reschedule@test.com',
            'meeting_type' => 'strategy_call',
        ]);

        $this->sync->syncBooking($meeting);
        $this->sync->syncReschedule($meeting);

        $contact = Contact::where('email', 'reschedule@test.com')->first();

        $this->assertSame(
            1,
            $contact->activities()->where('title', 'Strategy call booked')->count()
        );
        $this->assertSame(
            1,
            $contact->activities()->where('title', 'Strategy call rescheduled')->count()
        );
    }

    public function test_cancellation_logs_activity(): void
    {
        $meeting = $this->createMeeting([
            'name' => 'Cancel Me',
            'email' => 'cancel@test.com',
            'meeting_type' => 'discovery_call',
            'status' => 'cancelled',
        ]);

        $this->sync->syncBooking($meeting);
        $this->sync->syncCancellation($meeting);

        $contact = Contact::where('email', 'cancel@test.com')->first();

        $this->assertDatabaseHas('contact_activities', [
            'contact_id' => $contact->id,
            'title' => 'Discovery call cancelled',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createMeeting(array $overrides = []): PlatformMeeting
    {
        $start = Carbon::parse('2026-07-01 09:00:00', 'Europe/London')->utc();
        $end = $start->copy()->addMinutes(30);

        return PlatformMeeting::create(array_merge([
            'name' => 'Test Booker',
            'email' => 'booker@test.com',
            'meeting_type' => 'discovery_call',
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'scheduled',
            'timezone' => 'Europe/London',
        ], $overrides));
    }
}
