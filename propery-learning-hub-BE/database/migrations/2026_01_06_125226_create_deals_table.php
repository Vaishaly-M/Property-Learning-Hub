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
        Schema::create('deals', function (Blueprint $table) {
             $table->id();
            $table->string('title');
            $table->string('location');
            $table->decimal('price', 15, 2);
            $table->decimal('roi', 5, 2);
            $table->decimal('cap_rate', 5, 2);
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
            $table->integer('views')->default(0);
            $table->integer('inquiries')->default(0);
            $table->text('description')->nullable();
            $table->enum('property_type', ['commercial', 'residential', 'industrial', 'retail', 'mixed-use']);
            $table->decimal('occupancy', 5, 2)->nullable();
            $table->string('image_url')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for better performance
            $table->index('status');
            $table->index('property_type');
            $table->index('created_by');
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deals');
    }
};
