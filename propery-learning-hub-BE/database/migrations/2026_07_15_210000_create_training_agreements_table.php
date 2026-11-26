<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_agreements', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_token')->unique();
            $table->string('status', 32)->default('client_signed')->index();
            $table->string('agreement_version', 32)->default('2026-07');

            $table->string('client_full_name');
            $table->text('client_address');
            $table->date('client_dob')->nullable();
            $table->string('client_email')->index();
            $table->string('client_phone', 40)->nullable();
            $table->string('client_ico_number', 64)->nullable();

            $table->unsignedInteger('fee_amount_pence')->default(300000);
            $table->string('fee_currency', 8)->default('gbp');
            $table->string('payment_plan', 64)->default('full');
            $table->text('schedule_notes')->nullable();

            $table->longText('client_signature_data');
            $table->timestamp('client_signed_at');
            $table->string('client_signed_ip', 64)->nullable();
            $table->text('client_user_agent')->nullable();

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('academy_payment_id')->nullable()->constrained('academy_payments')->nullOnDelete();

            $table->longText('admin_signature_data')->nullable();
            $table->string('admin_signed_name')->nullable();
            $table->timestamp('admin_signed_at')->nullable();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('admin_signed_ip', 64)->nullable();

            $table->string('pdf_path')->nullable();
            $table->timestamp('pdf_emailed_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_agreements');
    }
};
