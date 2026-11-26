<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paid_user_invites', function (Blueprint $table) {
            $table->id();
            $table->uuid('token')->unique();
            $table->string('email');
            $table->string('status')->default('generated'); // generated, open, signed, joined, expired
            $table->timestamp('expires_at');
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('email_sent_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('training_agreement_id')->nullable()->constrained('training_agreements')->nullOnDelete();
            $table->foreignId('academy_payment_id')->nullable()->constrained('academy_payments')->nullOnDelete();
            $table->timestamps();

            $table->index(['email', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paid_user_invites');
    }
};
