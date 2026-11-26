<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_fields', function (Blueprint $table) {
            $table->id();
            $table->string('module_name')->index();
            $table->string('field_key');
            $table->string('field_name');
            $table->string('field_type');
            $table->json('validation')->nullable();
            $table->json('field_config')->nullable();
            $table->text('default_value')->nullable();
            $table->boolean('required')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('hidden')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['module_name', 'field_key']);
        });

        Schema::create('custom_field_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custom_field_id')->constrained('custom_fields')->cascadeOnDelete();
            $table->string('label');
            $table->string('value');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('custom_field_values', function (Blueprint $table) {
            $table->id();
            $table->string('module_name')->index();
            $table->unsignedBigInteger('record_id')->index();
            $table->foreignId('custom_field_id')->constrained('custom_fields')->cascadeOnDelete();
            $table->longText('value')->nullable();
            $table->timestamps();

            $table->unique(['module_name', 'record_id', 'custom_field_id'], 'custom_field_values_unique_record');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
        Schema::dropIfExists('custom_field_options');
        Schema::dropIfExists('custom_fields');
    }
};
