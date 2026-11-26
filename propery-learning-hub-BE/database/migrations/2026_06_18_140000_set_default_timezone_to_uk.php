<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('availability_settings')
            ->whereIn('timezone', ['Australia/Auckland', 'Pacific/Auckland'])
            ->update(['timezone' => 'Europe/London']);
    }

    public function down(): void
    {
        DB::table('availability_settings')
            ->where('timezone', 'Europe/London')
            ->update(['timezone' => 'Australia/Auckland']);
    }
};
