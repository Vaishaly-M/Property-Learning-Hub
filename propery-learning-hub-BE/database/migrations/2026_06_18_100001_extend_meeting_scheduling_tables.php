<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_meetings', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->unique()->after('id');
            $table->enum('booking_type', ['public', 'learner', 'mentor'])->default('public')->after('user_id');
            $table->string('phone')->nullable()->after('email');
            $table->string('teams_meeting_id')->nullable()->after('event_id');
            $table->string('organizer_email')->nullable()->after('teams_join_url');
            $table->string('manage_token', 64)->nullable()->unique()->after('organizer_email');
        });

        Schema::table('availability_settings', function (Blueprint $table) {
            $table->time('lunch_break_start')->nullable()->after('working_hours_end');
            $table->time('lunch_break_end')->nullable()->after('lunch_break_start');
        });

        Schema::create('admin_availability_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['start_time', 'end_time']);
        });

        Schema::create('admin_microsoft_connections', function (Blueprint $table) {
            $table->id();
            $table->string('microsoft_user_id')->nullable();
            $table->string('email');
            $table->string('display_name')->nullable();
            $table->text('access_token');
            $table->text('refresh_token');
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        if (Schema::hasTable('platform_meetings')) {
            \Illuminate\Support\Facades\DB::table('platform_meetings')->whereNull('uuid')->orderBy('id')->each(function ($row) {
                \Illuminate\Support\Facades\DB::table('platform_meetings')->where('id', $row->id)->update([
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'manage_token' => \Illuminate\Support\Str::random(48),
                    'booking_type' => 'public',
                ]);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_microsoft_connections');
        Schema::dropIfExists('admin_availability_blocks');

        Schema::table('availability_settings', function (Blueprint $table) {
            $table->dropColumn(['lunch_break_start', 'lunch_break_end']);
        });

        Schema::table('platform_meetings', function (Blueprint $table) {
            $table->dropColumn([
                'uuid', 'booking_type', 'phone', 'teams_meeting_id',
                'organizer_email', 'manage_token',
            ]);
        });
    }
};
