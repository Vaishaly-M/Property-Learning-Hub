<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Enums\CrmEnums;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactActivity;
use App\Models\ContactCourse;
use App\Models\ContactWebinarRegistration;
use App\Models\Course;
use App\Models\CrmEventRegistration;
use App\Models\Membership;
use App\Models\User;
use App\Models\Webinar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmDashboardController extends Controller
{
    public function index(Request $request)
    {
        $range = $request->query('range', '30days');
        $startDate = match ($range) {
            '7days'  => now()->subDays(7),
            '90days' => now()->subDays(90),
            '1year'  => now()->subYear(),
            default  => now()->subDays(30),
        };

        return response()->json([
            'success' => true,
            'data'    => [
                'membership_metrics' => $this->membershipMetrics(),
                'sales_metrics'      => $this->salesMetrics($startDate),
                'engagement_metrics' => $this->engagementMetrics($startDate),
                'lead_metrics'       => $this->leadMetrics($startDate),
                'classification_breakdown' => $this->classificationBreakdown(),
                'recent_activity'    => $this->recentActivity(),
                'renewals_due'       => $this->renewalsDue(),
            ],
        ]);
    }

    public function options()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'classifications'    => CrmEnums::CLASSIFICATIONS,
                'membership_types'   => CrmEnums::MEMBERSHIP_TYPES,
                'membership_statuses' => CrmEnums::MEMBERSHIP_STATUSES,
                'payment_statuses'   => CrmEnums::PAYMENT_STATUSES,
                'course_statuses'    => CrmEnums::COURSE_COMPLETION_STATUSES,
                'contact_statuses'   => CrmEnums::CONTACT_STATUSES,
            ],
        ]);
    }

    public function courses()
    {
        return response()->json([
            'success' => true,
            'data'    => Course::select('id', 'title')
                ->orderBy('title')
                ->get(),
        ]);
    }

    public function presenters()
    {
        $presenters = User::whereIn('role', ['admin', 'instructor'])
            ->select('id', 'first_name', 'last_name', 'email', 'role')
            ->orderBy('first_name')
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'name'  => trim("{$u->first_name} {$u->last_name}"),
                'email' => $u->email,
                'role'  => $u->role,
            ]);

        return response()->json(['success' => true, 'data' => $presenters]);
    }

    public function memberships()
    {
        // Only show memberships where the contact exists
        $items = Membership::whereHas('contact')
            ->with('contact:id,contact_ref,first_name,last_name,email')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($m) => [
                'id'             => $m->id,
                'type'           => $m->type,
                'status'         => $m->status,
                'start_date'     => $m->start_date?->toDateString(),
                'renewal_date'   => $m->renewal_date?->toDateString(),
                'expiry_date'    => $m->expiry_date?->toDateString(),
                'payment_status' => $m->payment_status,
                'amount'         => $m->amount,
                'contact'        => $m->contact ? [
                    'id'          => $m->contact->id,
                    'contact_ref' => $m->contact->contact_ref,
                    'full_name'   => $m->contact->full_name,
                    'email'       => $m->contact->email,
                ] : null,
            ]);

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function coursePurchases()
    {
        // Only show course purchases where course AND contact exist
        $records = ContactCourse::whereHas('course')
            ->whereHas('contact')
            ->with(['contact:id,contact_ref,first_name,last_name', 'course:id,title'])
            ->orderByDesc('purchase_date')
            ->get();

        $items = $records->map(fn ($cc) => [
            'id'                => $cc->id,
            'contact_id'        => $cc->contact_id,
            'course_id'         => $cc->course_id,
            'course_title'      => $cc->course?->title,
            'purchase_date'     => $cc->purchase_date?->toDateString(),
            'completion_status' => $cc->completion_status,
            'certificate_issued' => $cc->certificate_issued,
            'amount_paid'       => $cc->amount_paid !== null ? (float) $cc->amount_paid : null,
            'contact'           => $cc->contact ? [
                'id'          => $cc->contact->id,
                'contact_ref' => $cc->contact->contact_ref,
                'full_name'   => $cc->contact->full_name,
            ] : null,
        ]);

        $revenue = $records->sum(fn ($cc) => (float) ($cc->amount_paid ?? 0));

        return response()->json([
            'success' => true,
            'data'    => $items,
            'stats'   => [
                'total'       => $records->count(),
                'completed'   => $records->where('completion_status', 'completed')->count(),
                'in_progress' => $records->where('completion_status', 'in_progress')->count(),
                'revenue'     => round($revenue, 2),
            ],
        ]);
    }

    private function membershipMetrics(): array
    {
        return [
            'total_contacts'   => Contact::count(),
            'active_members'   => Membership::where('status', 'active')
                ->whereHas('contact')
                ->distinct('contact_id')
                ->count('contact_id'),
            'expired_members'  => Membership::where('status', 'expired')
                ->whereHas('contact')
                ->distinct('contact_id')
                ->count('contact_id'),
            'pending_members'  => Membership::where('status', 'pending')
                ->whereHas('contact')
                ->count(),
            'by_type' => [
                'community'      => Membership::where('type', 'community')
                    ->where('status', 'active')
                    ->whereHas('contact')
                    ->count(),
                'aftercare'      => Membership::where('type', 'aftercare')
                    ->where('status', 'active')
                    ->whereHas('contact')
                    ->count(),
                'vip_mentorship' => Membership::where('type', 'vip_mentorship')
                    ->where('status', 'active')
                    ->whereHas('contact')
                    ->count(),
            ],
        ];
    }

    private function salesMetrics($startDate): array
    {
        $courseRevenue = ContactCourse::whereHas('course')
            ->whereHas('contact')
            ->where('purchase_date', '>=', $startDate)
            ->sum('amount_paid');
            
        $membershipRevenue = Membership::whereHas('contact')
            ->where('created_at', '>=', $startDate)
            ->sum('amount');

        return [
            'course_sales'       => ContactCourse::whereHas('course')
                ->whereHas('contact')
                ->where('purchase_date', '>=', $startDate)
                ->count(),
            'course_revenue'     => (float) $courseRevenue,
            'membership_revenue' => (float) $membershipRevenue,
            'total_revenue'      => (float) ($courseRevenue + $membershipRevenue),
        ];
    }

    private function engagementMetrics($startDate): array
    {
        return [
            'webinar_registrations' => ContactWebinarRegistration::whereHas('contact')
                ->whereHas('webinar')
                ->where('registered_at', '>=', $startDate)
                ->count(),
            'webinar_attendance'    => ContactWebinarRegistration::whereHas('contact')
                ->whereHas('webinar')
                ->where('attended', true)
                ->where('registered_at', '>=', $startDate)
                ->count(),
            'event_registrations'   => CrmEventRegistration::whereHas('contact')
                ->whereHas('event')
                ->where('registered_at', '>=', $startDate)
                ->count(),
            'event_attendance'      => CrmEventRegistration::whereHas('contact')
                ->whereHas('event')
                ->where('attended', true)
                ->where('registered_at', '>=', $startDate)
                ->count(),
            'upcoming_webinars'     => Webinar::where('status', 'upcoming')->count(),
        ];
    }

    private function leadMetrics($startDate): array
    {
        $totalLeads = Contact::whereHas('classifications', fn ($q) => $q->where('classification', 'lead'))
            ->count();
            
        $converted = Contact::whereHas('classifications', fn ($q) => $q->whereIn('classification', ['course_customer', 'community_member', 'aftercare_member', 'vip_mentorship_member']))
            ->whereHas('classifications', fn ($q) => $q->where('classification', 'lead'))
            ->count();

        $discoveryCalls = Contact::whereHas('activities', fn ($q) => $q->where('activity_type', 'coaching_session'))
            ->count();

        return [
            'total_leads'           => $totalLeads,
            'lead_conversion_rate'  => $totalLeads > 0 ? round(($converted / $totalLeads) * 100, 1) : 0,
            'new_leads_period'      => Contact::whereHas('classifications', fn ($q) => $q->where('classification', 'lead'))
                ->where('created_at', '>=', $startDate)
                ->count(),
            'discovery_calls_booked' => $discoveryCalls,
        ];
    }

    private function classificationBreakdown(): array
    {
        return DB::table('contact_classifications')
            ->join('contacts', 'contact_classifications.contact_id', '=', 'contacts.id')
            ->select('classification', DB::raw('count(*) as count'))
            ->groupBy('classification')
            ->pluck('count', 'classification')
            ->toArray();
    }

    private function recentActivity(): array
    {
        return ContactActivity::whereHas('contact')
            ->with(['contact:id,first_name,last_name,contact_ref', 'performer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->limit(15)
            ->get()
            ->map(fn ($a) => [
                'id'           => $a->id,
                'type'         => $a->activity_type,
                'title'        => $a->title,
                'contact_name' => $a->contact?->full_name,
                'contact_ref'  => $a->contact?->contact_ref,
                'created_at'   => $a->created_at,
            ])
            ->toArray();
    }

    private function renewalsDue(): array
    {
        return Membership::whereHas('contact')
            ->with('contact:id,first_name,last_name,email,contact_ref')
            ->where('status', 'active')
            ->whereNotNull('renewal_date')
            ->whereBetween('renewal_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->orderBy('renewal_date')
            ->limit(10)
            ->get()
            ->map(fn ($m) => [
                'membership_id' => $m->id,
                'type'          => $m->type,
                'renewal_date'  => $m->renewal_date?->toDateString(),
                'contact'       => [
                    'id'          => $m->contact?->id,
                    'name'        => $m->contact?->full_name,
                    'email'       => $m->contact?->email,
                    'contact_ref' => $m->contact?->contact_ref,
                ],
            ])
            ->toArray();
    }
}