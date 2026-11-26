<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('webinar_registrations')) {
            return;
        }

        Schema::table('webinar_registrations', function (Blueprint $table) {
            if (! Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
                $table->boolean('manual_attendance')->default(false)->after('attended');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('webinar_registrations')) {
            return;
        }

        Schema::table('webinar_registrations', function (Blueprint $table) {
            if (Schema::hasColumn('webinar_registrations', 'manual_attendance')) {
                $table->dropColumn('manual_attendance');
            }
        });
    }
};
