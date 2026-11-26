<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Enums\CrmEnums;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Membership;
use App\Services\Crm\ClassificationWorkflowService;
use App\Services\Crm\ContactActivityService;
use App\Services\Crm\MembershipHistoryService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MembershipController extends Controller
{
    public function index(Contact $contact)
    {
        // Only show memberships where the contact exists
        $memberships = $contact->memberships()
            ->whereHas('contact') // Verify contact exists
            ->with('histories')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $memberships,
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
            'type'           => ['required', Rule::in(CrmEnums::MEMBERSHIP_TYPES)],
            'status'           => ['nullable', Rule::in(CrmEnums::MEMBERSHIP_STATUSES)],
            'start_date'     => 'nullable|date',
            'renewal_date'   => 'nullable|date',
            'expiry_date'    => 'nullable|date',
            'payment_status' => ['nullable', Rule::in(CrmEnums::PAYMENT_STATUSES)],
            'amount'         => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string',
        ]);

        $paymentStatus = $data['payment_status'] ?? 'pending';
        $status = $data['status']
            ?? ($paymentStatus === 'paid' ? 'active' : 'pending');

        $membership = $contact->memberships()->create([
            ...$data,
            'status'         => $status,
            'payment_status' => $paymentStatus,
        ]);

        MembershipHistoryService::record($membership, 'created');

        $classificationMap = [
            'community'      => 'community_member',
            'aftercare'      => 'aftercare_member',
            'vip_mentorship' => 'vip_mentorship_member',
        ];

        $existing = $contact->classifications()->pluck('classification')->toArray();
        if (! in_array($classificationMap[$data['type']], $existing)) {
            $existing[] = $classificationMap[$data['type']];
            $contact->syncClassifications($existing);
        }

        ContactActivityService::log(
            $contact,
            'membership_purchased',
            ucfirst(str_replace('_', ' ', $data['type'])) . ' membership added',
            "Status: {$membership->status}",
            ['membership_id' => $membership->id]
        );

        if (($data['payment_status'] ?? '') === 'paid') {
            ContactActivityService::log($contact, 'payment_received', 'Membership payment received', "£{$membership->amount}");
        }

        app(ClassificationWorkflowService::class)->applyRules($contact, 'membership_created', [
            'membership_type' => $data['type'],
        ]);

        return response()->json([
            'success' => true,
            'data'    => $membership,
            'message' => 'Membership created successfully',
        ], 201);
    }

    public function update(Request $request, Contact $contact, Membership $membership)
    {
        abort_if($membership->contact_id !== $contact->id, 404);

        // Verify contact exists
        if (!$contact->exists) {
            return response()->json([
                'success' => false,
                'message' => 'Contact not found',
            ], 404);
        }

        $data = $request->validate([
            'status'         => ['sometimes', Rule::in(CrmEnums::MEMBERSHIP_STATUSES)],
            'start_date'     => 'nullable|date',
            'renewal_date'   => 'nullable|date',
            'expiry_date'    => 'nullable|date',
            'payment_status' => ['sometimes', Rule::in(CrmEnums::PAYMENT_STATUSES)],
            'amount'         => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string',
        ]);

        $oldStatus = $membership->status;
        $oldPayment = $membership->payment_status;
        $membership->update($data);

        MembershipHistoryService::record($membership, 'updated');

        $activityType = match (true) {
            isset($data['status']) && $data['status'] === 'expired' => 'membership_expired',
            isset($data['renewal_date']) => 'membership_renewed',
            default => 'membership_purchased',
        };

        ContactActivityService::log(
            $contact,
            $activityType,
            'Membership updated',
            "Status: {$oldStatus} → {$membership->status}",
            ['membership_id' => $membership->id]
        );

        if (isset($data['payment_status']) && $data['payment_status'] === 'paid' && $oldPayment !== 'paid') {
            ContactActivityService::log($contact, 'payment_received', 'Membership payment received', "£{$membership->amount}");
        }

        if (isset($data['status']) && $data['status'] === 'expired') {
            app(ClassificationWorkflowService::class)->applyRules($contact, 'membership_expired');
        }

        return response()->json([
            'success' => true,
            'data'    => $membership->fresh(),
            'message' => 'Membership updated successfully',
        ]);
    }

    public function destroy(Contact $contact, Membership $membership)
    {
        abort_if($membership->contact_id !== $contact->id, 404);

        MembershipHistoryService::record($membership, 'deleted');
        $membership->delete();

        ContactActivityService::log($contact, 'membership_expired', 'Membership removed');
        app(ClassificationWorkflowService::class)->applyRules($contact, 'membership_expired');

        return response()->json([
            'success' => true,
            'message' => 'Membership deleted successfully',
        ]);
    }
}