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
        Schema::create('instructor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Personal & Professional Information
            $table->string('professional_title')->nullable();
            $table->string('profile_photo_path')->nullable();
            $table->text('bio')->nullable();
            $table->enum('industry_experience', ['0-2', '3-5', '6-10', '10+'])->nullable();
            $table->enum('primary_expertise', [
                'residential', 'commercial', 'reits', 'flipping', 
                'rentals', 'development', 'finance', 'law', 'tax', 'international'
            ])->nullable();
            
            // Teaching Profile
            $table->enum('teaching_experience', ['0-2', '3-5', '6-10', '10+'])->nullable();
            $table->enum('course_output', ['1-2', '3-4', '5-10', '10+'])->nullable();
            $table->json('teaching_specializations')->nullable();
            $table->text('qualifications')->nullable();
            $table->json('course_formats')->nullable();
            $table->string('languages')->nullable();
            
            // Social Links
            $table->string('linkedin_url')->nullable();
            $table->string('youtube_url')->nullable();
            $table->string('portfolio_url')->nullable();
            
            // Plan & Payment
            $table->enum('instructor_plan', ['free', 'professional', 'enterprise'])->default('free');
            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');
            
            // Status
            $table->boolean('profile_completed')->default(false);
            $table->boolean('accept_terms')->default(false);
            $table->timestamp('profile_completed_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instructor_profiles');
    }
};
