<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('meeting_type');
            $table->string('event_id')->nullable()->index();
            $table->text('teams_join_url')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->enum('status', ['scheduled', 'cancelled', 'completed', 'rescheduled'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->string('timezone')->default('Australia/Auckland');
            $table->timestamps();

            $table->index(['email', 'start_time', 'status']);
            $table->index(['user_id', 'start_time', 'status']);
            $table->index(['start_time', 'end_time', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_meetings');
    }
};
