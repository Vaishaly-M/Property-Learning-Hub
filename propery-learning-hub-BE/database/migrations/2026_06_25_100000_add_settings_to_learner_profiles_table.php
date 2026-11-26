<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('learner_profiles', 'settings')) {
                $table->json('settings')->nullable()->after('learning_preferences');
            }
        });
    }

    public function down(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('learner_profiles', 'settings')) {
                $table->dropColumn('settings');
            }
        });
    }
};
