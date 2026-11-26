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
          // Remove cap_rate if it exists
            if (Schema::hasColumn('deals', 'cap_rate')) {
                $table->dropColumn('cap_rate');
            }

            // Make price, roi, property_type, occupancy nullable
            $table->decimal('price', 15, 2)->nullable()->change();
            $table->decimal('roi', 5, 2)->nullable()->change();
            $table->string('property_type')->nullable()->change();
            $table->decimal('occupancy', 5, 2)->nullable()->change();

            // Add approval_status if not exists
            if (!Schema::hasColumn('deals', 'approval_status')) {
                $table->enum('approval_status', ['pending', 'approved', 'rejected'])
                    ->default('pending')
                    ->after('status');
            }

            // Add rejection_reason if not exists
            if (!Schema::hasColumn('deals', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('approval_status');
            }

            // Add approved_at if not exists
            if (!Schema::hasColumn('deals', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('rejection_reason');
            }

            // Add approved_by if not exists
            if (!Schema::hasColumn('deals', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->constrained('users')->after('approved_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
             // Revert changes if needed
            $table->decimal('price', 15, 2)->nullable(false)->change();
            $table->decimal('roi', 5, 2)->nullable(false)->change();
            $table->string('property_type')->nullable(false)->change();
            $table->decimal('occupancy', 5, 2)->nullable(false)->change();
            
            $table->decimal('cap_rate', 5, 2)->nullable()->after('roi');
            
            $table->dropColumn(['approval_status', 'rejection_reason', 'approved_at', 'approved_by']);
        });
    }
};
