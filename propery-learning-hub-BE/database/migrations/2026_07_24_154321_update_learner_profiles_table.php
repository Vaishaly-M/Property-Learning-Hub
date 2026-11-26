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
        Schema::table('learner_profiles', function (Blueprint $table) {
            // Add missing fields for profile completeness
            if (!Schema::hasColumn('learner_profiles', 'profile_completed')) {
                $table->boolean('profile_completed')->default(false);
            }
            if (!Schema::hasColumn('learner_profiles', 'payment_pending')) {
                $table->boolean('payment_pending')->default(false);
            }
            
            // Ensure all fields exist
            if (!Schema::hasColumn('learner_profiles', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'gender')) {
                $table->string('gender')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'job_title')) {
                $table->string('job_title')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'years_of_experience')) {
                $table->string('years_of_experience')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'investment_budget')) {
                $table->string('investment_budget')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'investment_interests')) {
                $table->json('investment_interests')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'learning_preferences')) {
                $table->json('learning_preferences')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'linkedin_url')) {
                $table->string('linkedin_url')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'alternate_phone')) {
                $table->string('alternate_phone')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'proof_of_address_path')) {
                $table->string('proof_of_address_path')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'proof_of_address_original_name')) {
                $table->string('proof_of_address_original_name')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'proof_of_address_mime')) {
                $table->string('proof_of_address_mime')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'proof_of_address_size')) {
                $table->integer('proof_of_address_size')->nullable();
            }
            if (!Schema::hasColumn('learner_profiles', 'proof_of_address_uploaded_at')) {
                $table->timestamp('proof_of_address_uploaded_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            $columns = [
                'profile_completed', 'payment_pending', 'date_of_birth', 'gender',
                'job_title', 'years_of_experience', 'investment_budget',
                'investment_interests', 'learning_preferences', 'linkedin_url',
                'alternate_phone', 'proof_of_address_path', 'proof_of_address_original_name',
                'proof_of_address_mime', 'proof_of_address_size', 'proof_of_address_uploaded_at'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('learner_profiles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
