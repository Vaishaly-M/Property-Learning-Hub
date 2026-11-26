<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\Crm\ContactController;
use App\Http\Controllers\Admin\Crm\MembershipController;
use App\Http\Controllers\Admin\Crm\ContactCourseController;
use App\Http\Controllers\Admin\Crm\CrmWebinarController;
use App\Http\Controllers\Admin\Crm\CrmEventController;
use App\Http\Controllers\Admin\Crm\CommunicationController;
use App\Http\Controllers\Admin\Crm\CrmDashboardController;
use App\Http\Controllers\Admin\Crm\CrmReportController;
use App\Http\Controllers\Admin\Crm\CrmWorkflowRuleController;

Route::prefix('crm')->group(function () {
    Route::get('/dashboard', [CrmDashboardController::class, 'index']);
    Route::get('/options', [CrmDashboardController::class, 'options']);
    Route::get('/presenters', [CrmDashboardController::class, 'presenters']);
    Route::get('/courses', [CrmDashboardController::class, 'courses']);
    Route::get('/memberships', [CrmDashboardController::class, 'memberships']);
    Route::get('/course-purchases', [CrmDashboardController::class, 'coursePurchases']);
    Route::get('/reports/export', [CrmReportController::class, 'export']);

    Route::get('/contacts', [ContactController::class, 'index']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::post('/contacts/import/preview', [\App\Http\Controllers\Admin\ContactController::class, 'importPreview']);
    Route::post('/contacts/import/analyze', [\App\Http\Controllers\Admin\ContactController::class, 'importAnalyze']);
    Route::post('/contacts/import', [\App\Http\Controllers\Admin\ContactController::class, 'import']);
    Route::get('/contacts/{contact}', [ContactController::class, 'show']);
    Route::put('/contacts/{contact}', [ContactController::class, 'update']);
    Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);
    Route::get('/contacts/{contact}/activities', [ContactController::class, 'activities']);
    Route::post('/contacts/{contact}/notes', [ContactController::class, 'addNote']);

    Route::get('/contacts/{contact}/memberships', [MembershipController::class, 'index']);
    Route::post('/contacts/{contact}/memberships', [MembershipController::class, 'store']);
    Route::put('/contacts/{contact}/memberships/{membership}', [MembershipController::class, 'update']);
    Route::delete('/contacts/{contact}/memberships/{membership}', [MembershipController::class, 'destroy']);

    Route::get('/contacts/{contact}/courses', [ContactCourseController::class, 'index']);
    Route::post('/contacts/{contact}/courses', [ContactCourseController::class, 'store']);
    Route::put('/contacts/{contact}/courses/{contactCourse}', [ContactCourseController::class, 'update']);
    Route::delete('/contacts/{contact}/courses/{contactCourse}', [ContactCourseController::class, 'destroy']);

    Route::get('/webinars', [CrmWebinarController::class, 'index']);
    Route::post('/webinars', [CrmWebinarController::class, 'store']);
    Route::get('/webinars/{webinar}', [CrmWebinarController::class, 'show']);
    Route::put('/webinars/{webinar}', [CrmWebinarController::class, 'update']);
    Route::post('/webinars/{webinar}/cancel', [CrmWebinarController::class, 'cancel']);
    Route::delete('/webinars/{webinar}', [CrmWebinarController::class, 'destroy']);
    Route::post('/webinars/{webinar}/register', [CrmWebinarController::class, 'registerContact']);
    Route::put('/webinars/{webinar}/registrations/{registration}', [CrmWebinarController::class, 'updateRegistration']);

    Route::get('/events', [CrmEventController::class, 'index']);
    Route::post('/events', [CrmEventController::class, 'store']);
    Route::get('/events/{event}', [CrmEventController::class, 'show']);
    Route::put('/events/{event}', [CrmEventController::class, 'update']);
    Route::delete('/events/{event}', [CrmEventController::class, 'destroy']);
    Route::post('/events/{event}/register', [CrmEventController::class, 'registerContact']);
    Route::put('/events/{event}/registrations/{registration}', [CrmEventController::class, 'updateRegistration']);

    Route::get('/communications/options', [CommunicationController::class, 'options']);
    Route::get('/communications', [CommunicationController::class, 'index']);
    Route::post('/communications', [CommunicationController::class, 'store']);
    Route::put('/communications/{communication}', [CommunicationController::class, 'update']);
    Route::get('/communications/{communication}', [CommunicationController::class, 'show']);
    Route::post('/communications/{communication}/send', [CommunicationController::class, 'send']);
    Route::post('/communications/{communication}/cancel', [CommunicationController::class, 'cancel']);
    Route::delete('/communications/{communication}', [CommunicationController::class, 'destroy']);

    Route::get('/workflow-rules', [CrmWorkflowRuleController::class, 'index']);
    Route::post('/workflow-rules', [CrmWorkflowRuleController::class, 'store']);
    Route::put('/workflow-rules/{workflowRule}', [CrmWorkflowRuleController::class, 'update']);
    Route::delete('/workflow-rules/{workflowRule}', [CrmWorkflowRuleController::class, 'destroy']);

    Route::get('/custom-fields', [\App\Http\Controllers\Admin\CustomFieldController::class, 'index']);
    Route::post('/custom-fields', [\App\Http\Controllers\Admin\CustomFieldController::class, 'store']);
    Route::put('/custom-fields/{id}', [\App\Http\Controllers\Admin\CustomFieldController::class, 'update']);
    Route::delete('/custom-fields/{id}', [\App\Http\Controllers\Admin\CustomFieldController::class, 'destroy']);
});
