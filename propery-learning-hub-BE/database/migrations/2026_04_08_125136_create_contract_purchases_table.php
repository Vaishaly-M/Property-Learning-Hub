<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('contract_template_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['pending', 'completed', 'refunded'])->default('completed');
            $table->decimal('amount_paid', 8, 2)->default(0);
            $table->string('stripe_payment_intent_id')->nullable(); // reserved for Stripe
            $table->timestamp('purchased_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'contract_template_id']); // one purchase per user per template
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_purchases');
    }
};