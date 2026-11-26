<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('deals', function (Blueprint $table) {
             // Add featured column
            $table->boolean('featured')->default(false)->after('status');
            
            // Add cash_flow column for monthly cash flow
            $table->decimal('cash_flow', 12, 2)->default(0)->after('cap_rate');
            
            // Add index for featured deals
            $table->index('featured');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->dropIndex(['featured']);
            $table->dropColumn(['featured', 'cash_flow']);
        });
    }
};
