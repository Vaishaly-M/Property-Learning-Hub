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
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('course_id')->nullable()->constrained()->onDelete('set null');
            $table->string('title');
            $table->string('issuer');
            $table->text('description')->nullable();
            $table->string('verification_code')->unique();
            $table->string('certificate_path')->nullable(); // PDF path
            $table->timestamp('issued_at');
            $table->timestamp('expires_at')->nullable();
            $table->json('metadata')->nullable(); // Course completion data
            $table->timestamps();
            
            $table->index(['user_id', 'issued_at']);
            $table->index('verification_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
