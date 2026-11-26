<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webinar_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webinar_id')->constrained()->onDelete('cascade');
            $table->foreignId('learner_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['registered', 'approved', 'rejected', 'waitlisted', 'cancelled'])->default('registered');
            $table->boolean('attended')->default(false);
            $table->unsignedInteger('watch_time')->nullable(); // minutes
            $table->string('payment_status')->nullable(); // paid, free, refunded
            $table->string('payment_reference')->nullable();
            $table->decimal('amount_paid', 10, 2)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->unique(['webinar_id', 'learner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webinar_registrations');
    }
};