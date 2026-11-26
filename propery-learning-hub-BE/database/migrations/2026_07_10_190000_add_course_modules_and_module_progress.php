<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['course_id', 'order']);
            $table->unique(['course_id', 'slug']);
        });

        Schema::table('contents', function (Blueprint $table) {
            if (!Schema::hasColumn('contents', 'module_id')) {
                $table->foreignId('module_id')
                    ->nullable()
                    ->after('course_id')
                    ->constrained('course_modules')
                    ->nullOnDelete();
                $table->index(['module_id', 'order']);
            }
        });

        // Expand content type to include images (MySQL enum alter)
        if (Schema::hasTable('contents')) {
            try {
                DB::statement("ALTER TABLE contents MODIFY COLUMN type ENUM('video','document','image') NOT NULL");
            } catch (\Throwable $e) {
                // SQLite / non-MySQL: skip enum alter; app validation still accepts image
            }
        }

        Schema::create('module_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('course_modules')->cascadeOnDelete();
            $table->unsignedTinyInteger('progress_percentage')->default(0);
            $table->boolean('is_completed')->default(false);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'module_id']);
            $table->index(['user_id', 'course_id']);
            $table->index(['module_id', 'is_completed']);
        });

        // Backfill: one default module per course; attach existing contents
        $courses = DB::table('courses')->select('id', 'title')->get();
        foreach ($courses as $course) {
            $slug = 'module-1';
            $moduleId = DB::table('course_modules')->insertGetId([
                'course_id' => $course->id,
                'title' => 'Module 1',
                'slug' => $slug,
                'description' => 'Default module (migrated from existing course content)',
                'order' => 1,
                'is_published' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('contents')
                ->where('course_id', $course->id)
                ->whereNull('module_id')
                ->update(['module_id' => $moduleId]);
        }

        // Ensure courses.order is sequential for existing rows that are all 0
        $orderedCourses = DB::table('courses')->orderBy('order')->orderBy('id')->pluck('id');
        $i = 1;
        foreach ($orderedCourses as $courseId) {
            DB::table('courses')->where('id', $courseId)->update(['order' => $i++]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('module_progress');

        Schema::table('contents', function (Blueprint $table) {
            if (Schema::hasColumn('contents', 'module_id')) {
                $table->dropConstrainedForeignId('module_id');
            }
        });

        Schema::dropIfExists('course_modules');

        try {
            DB::statement("ALTER TABLE contents MODIFY COLUMN type ENUM('video','document') NOT NULL");
        } catch (\Throwable $e) {
            // ignore
        }
    }
};
