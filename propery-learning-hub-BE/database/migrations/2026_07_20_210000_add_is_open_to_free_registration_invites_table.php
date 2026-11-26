<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('free_registration_invites', function (Blueprint $table) {
            $table->boolean('is_open')->default(false)->after('email');
        });

        // Allow never-expiring open invite links
        $this->makeExpiresAtNullable(true);
    }

    public function down(): void
    {
        DB::table('free_registration_invites')
            ->whereNull('expires_at')
            ->update(['expires_at' => now()->addDays(7)]);

        $this->makeExpiresAtNullable(false);

        Schema::table('free_registration_invites', function (Blueprint $table) {
            $table->dropColumn('is_open');
        });
    }

    private function makeExpiresAtNullable(bool $nullable): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            $nullSql = $nullable ? 'NULL' : 'NOT NULL';
            DB::statement("ALTER TABLE free_registration_invites MODIFY expires_at TIMESTAMP {$nullSql}");

            return;
        }

        // SQLite / others: portable schema change
        Schema::table('free_registration_invites', function (Blueprint $table) use ($nullable) {
            $table->timestamp('expires_at')->nullable($nullable)->change();
        });
    }
};
