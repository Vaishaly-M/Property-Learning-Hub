<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availability_settings', function (Blueprint $table) {
            $table->id();
            $table->time('working_hours_start')->default('09:00:00');
            $table->time('working_hours_end')->default('17:00:00');
            $table->unsignedSmallInteger('slot_duration')->default(30);
            $table->string('timezone')->default('Australia/Auckland');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_settings');
    }
};
