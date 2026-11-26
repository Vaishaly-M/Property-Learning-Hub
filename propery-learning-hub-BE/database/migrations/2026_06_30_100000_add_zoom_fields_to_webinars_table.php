<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webinars', function (Blueprint $table) {
            // Zoom Webinar integration fields
            $table->string('zoom_webinar_id')->nullable()->after('participant_type');
            $table->text('zoom_join_url')->nullable()->after('zoom_webinar_id');
            $table->text('zoom_start_url')->nullable()->after('zoom_join_url');
            $table->string('zoom_uuid')->nullable()->after('zoom_start_url');
            $table->string('zoom_password')->nullable()->after('zoom_uuid');
            $table->text('zoom_registration_url')->nullable()->after('zoom_password');

            // Unique index so we can never store duplicate Zoom webinar IDs
            $table->unique('zoom_webinar_id', 'webinars_zoom_webinar_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('webinars', function (Blueprint $table) {
            $table->dropUnique('webinars_zoom_webinar_id_unique');
            $table->dropColumn([
                'zoom_webinar_id',
                'zoom_join_url',
                'zoom_start_url',
                'zoom_uuid',
                'zoom_password',
                'zoom_registration_url',
            ]);
        });
    }
};
