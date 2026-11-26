<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::table('users', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->string('role')->default('learner')->change();
            });
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('learner', 'instructor', 'admin') NOT NULL");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::table('users', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->enum('role', ['learner', 'instructor'])->default('learner')->change();
            });
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('learner', 'instructor') NOT NULL");
    }
};