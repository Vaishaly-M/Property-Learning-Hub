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
            // Drop indexes first to avoid SQLite index corruption errors
            $table->dropIndex(['status']);
            $table->dropIndex(['status', 'created_at']);

            // Drop old approval columns if they exist
            if (Schema::hasColumn('deals', 'approved_by')) {
                $table->dropForeign(['approved_by']);
            }
            $table->dropColumn([
                'approval_status',
                'approved_at',
                'approved_by',
                'rejection_reason',
                'status' // drop old status enum
            ]);
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->string('status')->default('PENDING')->after('cap_rate');
            $table->text('rejection_note')->nullable()->after('status');
            $table->foreignId('verified_by')->nullable()->after('rejection_note')->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable()->after('verified_by');
            $table->string('submitted_by_role')->default('LEARNER')->after('verified_at'); // ADMIN or LEARNER
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->index('status');
            $table->index(['status', 'created_at']);
        });

        Schema::create('deal_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_id')->constrained('deals')->onDelete('cascade');
            $table->string('old_status');
            $table->string('new_status');
            $table->text('note')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deal_status_histories');

        Schema::table('deals', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropIndex(['status']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropColumn([
                'status',
                'rejection_note',
                'verified_by',
                'verified_at',
                'submitted_by_role'
            ]);
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft')->after('cap_rate');
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->after('status');
            $table->timestamp('approved_at')->nullable()->after('approval_status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->onDelete('set null');
            $table->text('rejection_reason')->nullable()->after('approved_by');
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->index('status');
            $table->index(['status', 'created_at']);
        });
    }
};
