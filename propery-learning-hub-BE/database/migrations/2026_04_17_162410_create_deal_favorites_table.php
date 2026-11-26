<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('deal_favorites')) {
            return;
        }

        Schema::create('deal_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('deal_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'deal_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_favorites');
    }
};
