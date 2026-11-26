<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->onDelete('cascade');
            $table->foreignId('learner_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->text('registration_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('registered_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();
            
            // Unique constraint to prevent duplicate registrations
            $table->unique(['meeting_id', 'learner_id']);
            
            // Indexes
            $table->index('learner_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_registrations');
    }
};