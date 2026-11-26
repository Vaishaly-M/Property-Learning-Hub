<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_agreements', function (Blueprint $table) {
            $table->string('agreement_type', 32)->default('training')->after('status');
        });

        Schema::table('free_registration_invites', function (Blueprint $table) {
            $table->foreignId('training_agreement_id')
                ->nullable()
                ->after('user_id')
                ->constrained('training_agreements')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('free_registration_invites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('training_agreement_id');
        });

        Schema::table('training_agreements', function (Blueprint $table) {
            $table->dropColumn('agreement_type');
        });
    }
};
