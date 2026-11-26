<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mentor_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mentor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_id')->nullable()->index();
            $table->string('meeting_id')->nullable()->index();
            $table->text('join_url')->nullable();
            $table->string('subject');
            $table->text('description')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->enum('status', ['scheduled', 'cancelled', 'completed', 'rescheduled'])->default('scheduled');
            $table->string('timezone')->default('UTC');
            $table->timestamps();

            $table->index(['mentor_id', 'start_time', 'status']);
            $table->index(['student_id', 'start_time', 'status']);
            $table->index(['mentor_id', 'student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mentor_sessions');
    }
};
