<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('webinar_recording_accesses')) {
            return;
        }

        // Legacy installs may have used the singular table name from an old migration file.
        if (Schema::hasTable('webinar_recording_access')) {
            Schema::rename('webinar_recording_access', 'webinar_recording_accesses');
            return;
        }

        Schema::create('webinar_recording_accesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webinar_id')->constrained()->onDelete('cascade');
            $table->foreignId('learner_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['pending', 'approved', 'rejected', 'revoked'])->default('pending');
            $table->text('request_message')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('download_count')->default(0);
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamps();

            $table->unique(['webinar_id', 'learner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webinar_recording_accesses');
    }
};
