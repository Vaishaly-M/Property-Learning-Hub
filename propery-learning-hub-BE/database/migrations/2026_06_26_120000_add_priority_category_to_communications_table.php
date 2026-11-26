<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('communications')) {
            return;
        }

        Schema::table('communications', function (Blueprint $table) {
            if (! Schema::hasColumn('communications', 'priority')) {
                $table->string('priority', 20)->default('medium')->after('body');
            }
            if (! Schema::hasColumn('communications', 'category')) {
                $table->string('category', 30)->default('general')->after('priority');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('communications')) {
            return;
        }

        Schema::table('communications', function (Blueprint $table) {
            if (Schema::hasColumn('communications', 'category')) {
                $table->dropColumn('category');
            }
            if (Schema::hasColumn('communications', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }
};
