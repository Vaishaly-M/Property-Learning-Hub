// database/migrations/2026_07_10_create_journal_notes_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('journal_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('content');
            $table->string('type')->default('checkbox'); // checkbox, business-plan, marketing-plan
            $table->string('goal')->nullable();
            $table->json('checklist')->nullable();
            $table->json('checked_items')->nullable();
            $table->json('shared_with')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('journal_notes');
    }
};