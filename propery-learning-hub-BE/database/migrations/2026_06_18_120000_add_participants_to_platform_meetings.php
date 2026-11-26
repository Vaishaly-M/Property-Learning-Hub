<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_meetings', function (Blueprint $table) {
            $table->json('participants')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('platform_meetings', function (Blueprint $table) {
            $table->dropColumn('participants');
        });
    }
};
