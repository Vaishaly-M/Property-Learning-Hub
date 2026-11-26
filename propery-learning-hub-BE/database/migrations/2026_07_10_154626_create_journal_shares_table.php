// database/migrations/2026_07_10_create_journal_shares_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('journal_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->nullable()->constrained('journal_notes')->onDelete('cascade');
            $table->foreignId('document_id')->nullable()->constrained('journal_documents')->onDelete('cascade');
            $table->foreignId('shared_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('shared_with')->constrained('users')->onDelete('cascade');
            $table->enum('permission', ['view', 'edit'])->default('view');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('journal_shares');
    }
};