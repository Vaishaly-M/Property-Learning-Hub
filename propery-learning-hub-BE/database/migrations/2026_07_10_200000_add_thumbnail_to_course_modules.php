<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_modules', function (Blueprint $table) {
            if (!Schema::hasColumn('course_modules', 'thumbnail_path')) {
                $table->string('thumbnail_path')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('course_modules', function (Blueprint $table) {
            if (Schema::hasColumn('course_modules', 'thumbnail_path')) {
                $table->dropColumn('thumbnail_path');
            }
        });
    }
};
