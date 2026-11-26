<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('contacts')) {
            Schema::table('contacts', function (Blueprint $table) {
                if (! Schema::hasColumn('contacts', 'contact_ref')) {
                    $table->string('contact_ref')->nullable()->after('id');
                }
                if (! Schema::hasColumn('contacts', 'phone_number')) {
                    $table->string('phone_number')->nullable()->after('email');
                }
                if (! Schema::hasColumn('contacts', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->after('status')->constrained()->nullOnDelete();
                }
            });

            if (Schema::hasColumn('contacts', 'phone') && Schema::hasColumn('contacts', 'phone_number')) {
                DB::table('contacts')->whereNotNull('phone')->whereNull('phone_number')
                    ->update(['phone_number' => DB::raw('phone')]);
            }

            $contacts = DB::table('contacts')->whereNull('contact_ref')->orderBy('id')->get();
            foreach ($contacts as $contact) {
                DB::table('contacts')->where('id', $contact->id)->update([
                    'contact_ref' => 'FPA-' . str_pad((string) $contact->id, 6, '0', STR_PAD_LEFT),
                ]);
            }

            Schema::table('contacts', function (Blueprint $table) {
                if (Schema::hasColumn('contacts', 'contact_ref')) {
                    $table->string('contact_ref')->nullable(false)->unique()->change();
                }
            });
        } else {
            Schema::create('contacts', function (Blueprint $table) {
                $table->id();
                $table->string('contact_ref')->unique();
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->nullable()->index();
                $table->string('phone_number')->nullable();
                $table->text('notes')->nullable();
                $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('contact_classifications')) {
            Schema::create('contact_classifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->string('classification');
                $table->timestamps();
                $table->unique(['contact_id', 'classification']);
            });

            if (Schema::hasColumn('contacts', 'classification')) {
                $rows = DB::table('contacts')->whereNotNull('classification')->where('classification', '!=', '')->get();
                foreach ($rows as $row) {
                    DB::table('contact_classifications')->insertOrIgnore([
                        'contact_id'     => $row->id,
                        'classification' => $row->classification,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                }
            }
        }

        if (! Schema::hasTable('memberships')) {
            Schema::create('memberships', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->enum('type', ['community', 'aftercare', 'vip_mentorship']);
                $table->enum('status', ['active', 'pending', 'expired', 'cancelled', 'suspended'])->default('pending');
                $table->date('start_date')->nullable();
                $table->date('renewal_date')->nullable();
                $table->date('expiry_date')->nullable();
                $table->enum('payment_status', ['paid', 'pending', 'overdue', 'refunded'])->default('pending');
                $table->decimal('amount', 10, 2)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('contact_courses')) {
            Schema::create('contact_courses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->foreignId('course_id')->constrained()->cascadeOnDelete();
                $table->date('purchase_date');
                $table->enum('completion_status', ['not_started', 'in_progress', 'completed'])->default('not_started');
                $table->boolean('certificate_issued')->default(false);
                $table->timestamp('certificate_issued_at')->nullable();
                $table->decimal('amount_paid', 10, 2)->nullable();
                $table->timestamps();
                $table->unique(['contact_id', 'course_id']);
            });
        }

        if (! Schema::hasTable('crm_events')) {
            Schema::create('crm_events', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('venue')->nullable();
                $table->string('online_link')->nullable();
                $table->unsignedInteger('capacity')->nullable();
                $table->dateTime('starts_at');
                $table->dateTime('ends_at')->nullable();
                $table->enum('status', ['draft', 'published', 'completed', 'cancelled'])->default('draft');
                $table->foreignId('presenter_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('crm_event_registrations')) {
            Schema::create('crm_event_registrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('crm_event_id')->constrained()->cascadeOnDelete();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->boolean('attended')->default(false);
                $table->boolean('no_show')->default(false);
                $table->timestamp('registered_at')->useCurrent();
                $table->timestamps();
                $table->unique(['crm_event_id', 'contact_id']);
            });
        }

        if (! Schema::hasTable('contact_webinar_registrations')) {
            Schema::create('contact_webinar_registrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('webinar_id')->constrained()->cascadeOnDelete();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->boolean('attended')->default(false);
                $table->boolean('no_show')->default(false);
                $table->enum('status', ['registered', 'confirmed', 'cancelled'])->default('registered');
                $table->timestamp('registered_at')->useCurrent();
                $table->timestamps();
                $table->unique(['webinar_id', 'contact_id']);
            });
        }

        if (! Schema::hasTable('communications')) {
            Schema::create('communications', function (Blueprint $table) {
                $table->id();
                $table->enum('type', [
                    'email_campaign',
                    'newsletter',
                    'webinar_invitation',
                    'event_invitation',
                    'membership_update',
                    'renewal_reminder',
                    'follow_up_sequence',
                ]);
                $table->string('subject');
                $table->text('body');
                $table->string('audience_filter')->default('custom');
                $table->json('filter_params')->nullable();
                $table->enum('status', ['draft', 'scheduled', 'sending', 'sent', 'cancelled'])->default('draft');
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->unsignedInteger('recipient_count')->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('communication_recipients')) {
            Schema::create('communication_recipients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('communication_id')->constrained()->cascadeOnDelete();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->enum('status', ['pending', 'sent', 'failed', 'bounced'])->default('pending');
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();
                $table->unique(['communication_id', 'contact_id']);
            });
        }

        if (! Schema::hasTable('contact_activities')) {
            Schema::create('contact_activities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
                $table->string('activity_type');
                $table->string('title');
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('happened_at')->nullable();
                $table->timestamps();
                $table->index(['contact_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('communication_recipients');
        Schema::dropIfExists('communications');
        Schema::dropIfExists('contact_webinar_registrations');
        Schema::dropIfExists('crm_event_registrations');
        Schema::dropIfExists('crm_events');
        Schema::dropIfExists('contact_courses');
        Schema::dropIfExists('memberships');
        Schema::dropIfExists('contact_classifications');
    }
};
