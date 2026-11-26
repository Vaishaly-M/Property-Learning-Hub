<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Enums\CrmEnums;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactCourse;
use App\Models\Course;
use App\Services\Crm\ContactActivityService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContactCourseController extends Controller
{
    public function index(Contact $contact)
    {
        // Only show course records where the course and contact exist
        $courses = $contact->contactCourses()
            ->whereHas('course') // Verify course exists
            ->whereHas('contact') // Verify contact exists
            ->with('course')
            ->orderByDesc('purchase_date')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $courses,
        ]);
    }

    public function store(Request $request, Contact $contact)
    {
        // Verify contact exists
        if (!$contact->exists) {
            return response()->json([
                'success' => false,
                'message' => 'Contact not found',
            ], 404);
        }

        $data = $request->validate([
            'course_id'         => 'required|exists:courses,id',
            'purchase_date'     => 'nullable|date',
            'completion_status' => ['nullable', Rule::in(CrmEnums::COURSE_COMPLETION_STATUSES)],
            'certificate_issued' => 'nullable|boolean',
            'amount_paid'       => 'nullable|numeric|min:0',
        ]);

        // Verify course exists
        $course = Course::where('id', $data['course_id'])->first();
        if (!$course) {
            return response()->json([
                'success' => false,
                'message' => 'Course not found',
            ], 404);
        }

        $contactCourse = $contact->contactCourses()->create([
            'course_id'         => $data['course_id'],
            'purchase_date'     => $data['purchase_date'] ?? now()->toDateString(),
            'completion_status' => $data['completion_status'] ?? 'not_started',
            'certificate_issued' => $data['certificate_issued'] ?? false,
            'certificate_issued_at' => ($data['certificate_issued'] ?? false) ? now() : null,
            'amount_paid'       => $data['amount_paid'] ?? null,
        ]);

        $existing = $contact->classifications()->pluck('classification')->toArray();
        foreach (['course_customer', 'academy_student'] as $cls) {
            if (!in_array($cls, $existing)) {
                $existing[] = $cls;
            }
        }
        $contact->syncClassifications($existing);

        ContactActivityService::log(
            $contact,
            'course_purchased',
            "Course purchased: {$course->title}",
            null,
            ['course_id' => $course->id, 'contact_course_id' => $contactCourse->id]
        );

        return response()->json([
            'success' => true,
            'data'    => $contactCourse->load('course'),
            'message' => 'Course added successfully',
        ], 201);
    }

    public function update(Request $request, Contact $contact, ContactCourse $contactCourse)
    {
        abort_if($contactCourse->contact_id !== $contact->id, 404);

        // Verify contact and course exist
        if (!$contact->exists || !$contactCourse->course()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Contact or course not found',
            ], 404);
        }

        $data = $request->validate([
            'purchase_date'     => 'nullable|date',
            'completion_status' => ['sometimes', Rule::in(CrmEnums::COURSE_COMPLETION_STATUSES)],
            'certificate_issued' => 'nullable|boolean',
            'amount_paid'       => 'nullable|numeric|min:0',
        ]);

        if (array_key_exists('certificate_issued', $data)) {
            $data['certificate_issued_at'] = $data['certificate_issued'] ? now() : null;
        }

        $oldAmount = $contactCourse->amount_paid;
        $contactCourse->update($data);

        if (array_key_exists('amount_paid', $data)) {
            $newAmount = $data['amount_paid'];
            $amountChanged = (float) ($oldAmount ?? 0) !== (float) ($newAmount ?? 0);
            if ($amountChanged) {
                $contactCourse->loadMissing('course');
                $courseTitle = $contactCourse->course?->title ?? 'Course';
                ContactActivityService::log(
                    $contact,
                    'course_purchased',
                    "Course amount updated: {$courseTitle}",
                    sprintf(
                        'Amount changed from £%s to £%s',
                        number_format((float) ($oldAmount ?? 0), 2),
                        number_format((float) ($newAmount ?? 0), 2)
                    ),
                    ['contact_course_id' => $contactCourse->id, 'course_id' => $contactCourse->course_id]
                );
            }
        }

        return response()->json([
            'success' => true,
            'data'    => $contactCourse->fresh()->load('course'),
            'message' => 'Course record updated successfully',
        ]);
    }

    public function destroy(Contact $contact, ContactCourse $contactCourse)
    {
        abort_if($contactCourse->contact_id !== $contact->id, 404);
        $contactCourse->delete();

        return response()->json([
            'success' => true,
            'message' => 'Course record removed successfully',
        ]);
    }
}