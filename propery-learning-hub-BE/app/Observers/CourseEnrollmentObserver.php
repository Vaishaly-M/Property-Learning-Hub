<?php

namespace App\Observers;

use App\Models\CourseEnrollment;
use App\Models\ContactCourse;
use App\Services\Crm\ClassificationWorkflowService;
use App\Services\Crm\ContactActivityService;
use App\Services\Crm\CrmContactSyncService;

class CourseEnrollmentObserver
{
    public function created(CourseEnrollment $enrollment): void
    {
        $user = $enrollment->user;
        $course = $enrollment->course;
        if (! $user || ! $course) {
            return;
        }

        $contact = app(CrmContactSyncService::class)->findOrCreateFromUser($user, 'course enrollment');

        $contactCourse = ContactCourse::firstOrCreate(
            ['contact_id' => $contact->id, 'course_id' => $course->id],
            [
                'purchase_date'     => $enrollment->enrolled_at?->toDateString() ?? now()->toDateString(),
                'completion_status' => $enrollment->status === 'completed' ? 'completed' : 'not_started',
            ]
        );

        if ($contactCourse->wasRecentlyCreated) {
            $existing = $contact->classifications()->pluck('classification')->toArray();
            foreach (['course_customer', 'academy_student'] as $cls) {
                if (! in_array($cls, $existing)) {
                    $existing[] = $cls;
                }
            }
            $contact->syncClassifications($existing);

            ContactActivityService::log(
                $contact,
                'course_purchased',
                "Course enrolled (platform sync): {$course->title}",
                null,
                ['course_id' => $course->id, 'enrollment_id' => $enrollment->id]
            );
        }

        app(ClassificationWorkflowService::class)->applyRules($contact, 'course_purchased');
    }

    public function updated(CourseEnrollment $enrollment): void
    {
        if (! $enrollment->wasChanged('status') && ! $enrollment->wasChanged('completed_at')) {
            return;
        }

        $user = $enrollment->user;
        if (! $user) {
            return;
        }

        $contact = app(CrmContactSyncService::class)->findOrCreateFromUser($user, 'course enrollment update');
        $contactCourse = ContactCourse::where('contact_id', $contact->id)
            ->where('course_id', $enrollment->course_id)
            ->first();

        if (! $contactCourse) {
            return;
        }

        $status = match ($enrollment->status) {
            'completed' => 'completed',
            'in_progress', 'active' => 'in_progress',
            default => 'not_started',
        };

        $contactCourse->update([
            'completion_status' => $status,
            'certificate_issued' => $status === 'completed' ? true : $contactCourse->certificate_issued,
            'certificate_issued_at' => $status === 'completed' && ! $contactCourse->certificate_issued_at ? now() : $contactCourse->certificate_issued_at,
        ]);
    }
}
