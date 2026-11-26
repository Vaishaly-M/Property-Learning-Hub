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
         Schema::create('learner_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Personal Information
            $table->string('profile_photo_path')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other', 'prefer-not-to-say'])->nullable();
            $table->text('bio')->nullable();
            
            // Professional Information
            $table->string('job_title')->nullable();
            $table->string('company')->nullable();
            $table->enum('years_of_experience', ['beginner', 'intermediate', 'advanced', 'expert'])->nullable();
            $table->enum('investment_budget', [
                'under-50k', '50k-200k', '200k-500k', '500k-1m', 'over-1m'
            ])->nullable();
            
            // Interests & Preferences
            $table->json('investment_interests')->nullable();
            $table->json('learning_preferences')->nullable();
            
            // Contact Information
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('alternate_phone')->nullable();
            $table->string('linkedin_url')->nullable();
            
            // Subscription
            $table->enum('subscription_plan', ['free', 'basic', 'pro'])->default('free');
            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');
            
            // Status
            $table->boolean('profile_completed')->default(false);
            $table->timestamp('profile_completed_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('learner_profiles');
    }
};
