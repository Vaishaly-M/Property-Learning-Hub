<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // creator
            $table->string('title');
            $table->string('category'); // Purchase, Lease, Partnership, Disclosure, etc.
            $table->text('description')->nullable();
            $table->decimal('price', 8, 2)->default(0); // 0 = free
            $table->string('file_path')->nullable();     // uploaded .docx / .pdf
            $table->string('file_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_global')->default(false); // true = visible to all learners
            $table->json('docusign_template_id')->nullable(); // reserved for DocuSign
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_templates');
    }
};