<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('microsoft_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('microsoft_user_id')->index();
            $table->string('email');
            $table->string('display_name')->nullable();
            $table->text('access_token');
            $table->text('refresh_token');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->unique('user_id');
            $table->unique(['microsoft_user_id', 'user_id'], 'microsoft_accounts_ms_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('microsoft_accounts');
    }
};
