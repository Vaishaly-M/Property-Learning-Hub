<?php

use App\Models\User;
use App\Models\Webinar;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $adminInstructorIds = User::query()
            ->whereIn('role', ['admin', 'super_admin'])
            ->pluck('id');

        if ($adminInstructorIds->isEmpty()) {
            return;
        }

        Webinar::query()
            ->whereIn('instructor_id', $adminInstructorIds)
            ->where(function ($query) {
                $query->where('participant_type', 'my_learners')
                    ->orWhereNull('participant_type')
                    ->orWhere('participant_type', '');
            })
            ->update(['participant_type' => 'all_learners']);
    }

    public function down(): void
    {
        // Non-destructive data normalization; no rollback required.
    }
};
