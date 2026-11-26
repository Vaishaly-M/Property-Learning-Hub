<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('webinars', function (Blueprint $table) {
            // Add participant_type column
            $table->enum('participant_type', ['my_learners', 'all_learners', 'all_others'])
                  ->default('my_learners')
                  ->after('max_attendees');
            
            // Drop host_name and host_bio columns if they exist
            if (Schema::hasColumn('webinars', 'host_name')) {
                $table->dropColumn('host_name');
            }
            if (Schema::hasColumn('webinars', 'host_bio')) {
                $table->dropColumn('host_bio');
            }
        });
    }
    
    public function down()
    {
        Schema::table('webinars', function (Blueprint $table) {
            $table->dropColumn('participant_type');
            $table->string('host_name')->nullable();
            $table->text('host_bio')->nullable();
        });
    }
};