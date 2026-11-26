<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            $table->string('proof_of_address_path')->nullable()->after('profile_photo_path');
            $table->string('proof_of_address_original_name')->nullable()->after('proof_of_address_path');
            $table->string('proof_of_address_mime', 120)->nullable()->after('proof_of_address_original_name');
            $table->unsignedBigInteger('proof_of_address_size')->nullable()->after('proof_of_address_mime');
            $table->timestamp('proof_of_address_uploaded_at')->nullable()->after('proof_of_address_size');
        });
    }

    public function down(): void
    {
        Schema::table('learner_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'proof_of_address_path',
                'proof_of_address_original_name',
                'proof_of_address_mime',
                'proof_of_address_size',
                'proof_of_address_uploaded_at',
            ]);
        });
    }
};
