<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_agreements', function (Blueprint $table) {
            $table->string('admin_signed_position')->nullable()->after('admin_signed_name');
        });
    }

    public function down(): void
    {
        Schema::table('training_agreements', function (Blueprint $table) {
            $table->dropColumn('admin_signed_position');
        });
    }
};
