<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            $table->boolean('payment_pending')
                ->default(false)
                ->after('billing_cycle');
        });
    }

    public function down(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            $table->dropColumn('payment_pending');
        });
    }
};
