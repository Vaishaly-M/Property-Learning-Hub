<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_meetings', function (Blueprint $table) {
            $table->enum('meeting_provider', ['teams', 'zoom'])->default('teams')->after('meeting_type');
            $table->string('provider_meeting_id')->nullable()->after('teams_join_url');
            $table->text('provider_join_url')->nullable()->after('provider_meeting_id');
            $table->text('provider_start_url')->nullable()->after('provider_join_url');
        });
    }

    public function down(): void
    {
        Schema::table('platform_meetings', function (Blueprint $table) {
            $table->dropColumn([
                'meeting_provider',
                'provider_meeting_id',
                'provider_join_url',
                'provider_start_url',
            ]);
        });
    }
};
