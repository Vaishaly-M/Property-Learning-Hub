<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['one-on-one', 'group', 'team'])->default('group');
            $table->date('date');
            $table->time('time');
            $table->integer('duration')->default(60); // in minutes
            $table->enum('status', ['scheduled', 'in-progress', 'completed', 'cancelled'])->default('scheduled');
            $table->string('meeting_link')->nullable();
            $table->string('zoom_meeting_id')->nullable();
            $table->string('zoom_password')->nullable();
            $table->boolean('waiting_room')->default(true);
            $table->boolean('allow_recording')->default(true);
            $table->string('recording_url')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['date', 'status']);
            $table->index('instructor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};