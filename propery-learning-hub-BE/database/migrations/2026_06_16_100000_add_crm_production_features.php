<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('contacts') && ! Schema::hasColumn('contacts', 'deleted_at')) {
            Schema::table('contacts', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('membership_histories')) {
            Schema::create('membership_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('membership_id')->constrained()->cascadeOnDelete();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->string('action');
                $table->json('snapshot')->nullable();
                $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('crm_workflow_rules')) {
            Schema::create('crm_workflow_rules', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('trigger_event');
                $table->json('conditions')->nullable();
                $table->json('actions');
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('priority')->default(0);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('contact_webinar_registrations')) {
            Schema::table('contact_webinar_registrations', function (Blueprint $table) {
                if (! Schema::hasColumn('contact_webinar_registrations', 'confirmation_sent_at')) {
                    $table->timestamp('confirmation_sent_at')->nullable()->after('registered_at');
                }
                if (! Schema::hasColumn('contact_webinar_registrations', 'reminder_sent_at')) {
                    $table->timestamp('reminder_sent_at')->nullable()->after('confirmation_sent_at');
                }
                if (! Schema::hasColumn('contact_webinar_registrations', 'follow_up_sent_at')) {
                    $table->timestamp('follow_up_sent_at')->nullable()->after('reminder_sent_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contact_webinar_registrations')) {
            Schema::table('contact_webinar_registrations', function (Blueprint $table) {
                $table->dropColumn(['confirmation_sent_at', 'reminder_sent_at', 'follow_up_sent_at']);
            });
        }

        Schema::dropIfExists('crm_workflow_rules');
        Schema::dropIfExists('membership_histories');

        if (Schema::hasTable('contacts') && Schema::hasColumn('contacts', 'deleted_at')) {
            Schema::table('contacts', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
