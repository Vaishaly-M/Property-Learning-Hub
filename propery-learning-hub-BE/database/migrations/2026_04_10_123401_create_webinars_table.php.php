<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webinars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->date('date');
            $table->time('time');
            $table->unsignedInteger('duration'); // in minutes
            $table->enum('category', ['market', 'investment', 'tax', 'legal', 'beginner']);
            $table->enum('level', ['beginner', 'intermediate', 'advanced']);
            $table->decimal('price', 10, 2)->default(0);
            $table->unsignedInteger('max_attendees')->default(100);
            $table->enum('status', ['upcoming', 'live', 'completed', 'cancelled'])->default('upcoming');
            $table->string('host_name');
            $table->text('host_bio')->nullable();
            $table->string('live_link')->nullable();
            $table->string('replay_link')->nullable();
            $table->string('thumbnail')->nullable();
            // Recording
            $table->string('recording_path')->nullable();
            $table->string('recording_original_name')->nullable();
            $table->unsignedBigInteger('recording_size')->nullable(); // bytes
            $table->string('recording_mime_type')->nullable();
            $table->string('materials_url')->nullable();
            // Stats (computed/cached)
            $table->decimal('avg_watch_time', 8, 2)->nullable();
            $table->decimal('engagement_rate', 5, 2)->nullable();
            $table->decimal('satisfaction_score', 5, 2)->nullable();
            $table->unsignedInteger('peak_attendees')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webinars');
    }
};