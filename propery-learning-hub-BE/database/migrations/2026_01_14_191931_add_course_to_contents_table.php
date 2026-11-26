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
        Schema::table('contents', function (Blueprint $table) {

            $table->foreignId('course_id')->nullable()->after('category_id')
                  ->constrained('courses')->onDelete('set null');

            $table->integer('order')->default(0)->after('course_id');
            
            $table->index(['course_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contents', function (Blueprint $table) {
            $table->dropForeign(['course_id']);
            $table->dropIndex(['course_id', 'order']);
            $table->dropColumn(['course_id', 'order']);
        });
    }
};
