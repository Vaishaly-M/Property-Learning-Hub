<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            if (!Schema::hasColumn('deals', 'listing_kind')) {
                $table->string('listing_kind', 32)
                    ->default('marketplace')
                    ->after('status')
                    ->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            if (Schema::hasColumn('deals', 'listing_kind')) {
                $table->dropIndex(['listing_kind']);
                $table->dropColumn('listing_kind');
            }
        });
    }
};
