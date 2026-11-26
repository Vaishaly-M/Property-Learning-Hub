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
        Schema::table('instructor_profiles', function (Blueprint $table) {
        $table->string('country')->nullable()->after('portfolio_url');
        $table->string('city')->nullable()->after('country');
    });
    
    Schema::table('learner_profiles', function (Blueprint $table) {
        if (!Schema::hasColumn('learner_profiles', 'country')) {
            $table->string('country')->nullable()->after('linkedin_url');
        }
        if (!Schema::hasColumn('learner_profiles', 'city')) {
            $table->string('city')->nullable()->after('country');
        }
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('instructor_profiles', function (Blueprint $table) {
            //
        });
    }
};
