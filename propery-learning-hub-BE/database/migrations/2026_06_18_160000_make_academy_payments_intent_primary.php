<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('academy_payments')) {
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('academy_payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->string('stripe_checkout_session_id')->nullable()->change();
            });
        } else {
            DB::statement('ALTER TABLE academy_payments MODIFY stripe_checkout_session_id VARCHAR(255) NULL');
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('academy_payments')) {
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('academy_payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->string('stripe_checkout_session_id')->nullable(false)->change();
            });
        } else {
            DB::statement('ALTER TABLE academy_payments MODIFY stripe_checkout_session_id VARCHAR(255) NOT NULL');
        }
    }
};
