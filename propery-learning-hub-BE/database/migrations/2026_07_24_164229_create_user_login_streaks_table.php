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
        Schema::create('user_login_streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('last_login_date');
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->json('login_dates')->nullable(); // Store all login dates for verification
            $table->timestamps();
            
            $table->unique('user_id');
            $table->index('last_login_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_login_streaks');
    }
};
