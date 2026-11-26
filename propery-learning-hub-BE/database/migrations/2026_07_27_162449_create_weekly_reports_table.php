<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('weekly_reports', function (Blueprint $table) {
              $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Report period
            $table->date('week_start');
            $table->date('week_end');
            $table->integer('week_number');
            $table->integer('year');
            
            // Current week metrics
            $table->integer('courses_enrolled_current')->default(0);
            $table->integer('courses_completed_current')->default(0);
            $table->integer('lessons_completed_current')->default(0);
            $table->integer('watch_time_seconds_current')->default(0);
            $table->integer('meetings_attended_current')->default(0);
            $table->integer('webinars_attended_current')->default(0);
            
            // Previous week metrics (for comparison)
            $table->integer('courses_enrolled_previous')->default(0);
            $table->integer('courses_completed_previous')->default(0);
            $table->integer('lessons_completed_previous')->default(0);
            $table->integer('watch_time_seconds_previous')->default(0);
            $table->integer('meetings_attended_previous')->default(0);
            $table->integer('webinars_attended_previous')->default(0);
            
            // Comparison data (stored as JSON for flexibility)
            $table->json('comparison_data')->nullable();
            
            // Weekly status messages
            $table->string('status_message')->nullable();
            $table->string('next_week_goals')->nullable();
            
            $table->timestamps();
            
            // Index for faster queries
            $table->index(['user_id', 'week_start']);
            $table->index(['year', 'week_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weekly_reports');
    }
};
