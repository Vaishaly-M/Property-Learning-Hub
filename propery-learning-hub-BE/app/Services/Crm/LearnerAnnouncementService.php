<?php

namespace App\Services\Crm;

use App\Models\Communication;
use App\Models\User;
use App\Models\Webinar;
use App\Models\WebinarRegistration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class LearnerAnnouncementService
{
    private const ANNOUNCEMENT_TYPES = [
        'email_campaign',
        'membership_update',
        'newsletter',
    ];

    public function shouldPublishToLearners(Communication $communication): bool
    {
        return in_array($communication->type, self::ANNOUNCEMENT_TYPES, true);
    }

    public function publish(Communication $communication): int
    {
        if (! $this->shouldPublishToLearners($communication)) {
            return 0;
        }

        if (! Schema::hasTable('notifications')) {
            return 0;
        }

        $query = User::query()->where('status', 'active');

        if ($communication->audience_filter === 'all_admins') {
            $query->whereIn('role', ['admin', 'super_admin']);
        } else {
            $query->where('role', 'learner');
        }

        $learners = $query->get(['id']);

        if ($learners->isEmpty()) {
            return 0;
        }

        $now = now();
        $payload = json_encode([
            'title'             => $communication->subject,
            'message'           => $communication->body,
            'description'       => $communication->body,
            'type'              => 'announcement',
            'communication_id'  => $communication->id,
            'audience_filter'   => $communication->audience_filter,
            'priority'          => $communication->priority ?? 'medium',
            'category'          => $communication->category ?? 'general',
            'is_bookmarked'     => false,
            'is_pinned'         => false,
        ]);

        $rows = $learners->map(fn (User $learner) => [
            'id'              => (string) Str::uuid(),
            'type'            => 'learner_announcement',
            'notifiable_type' => User::class,
            'notifiable_id'   => $learner->id,
            'data'            => $payload,
            'created_at'      => $now,
            'updated_at'      => $now,
        ])->all();

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('notifications')->insert($chunk);
        }

        return count($rows);
    }

    public function notifyWebinarRegistrationRejected(
        User $learner,
        Webinar $webinar,
        WebinarRegistration $registration,
        array $refundData = [],
    ): void {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        $amount = (float) ($registration->amount_paid ?? $webinar->price ?? 0);
        $wasPaid = in_array($registration->payment_status, ['paid', 'refunded'], true) && $amount > 0;
        $refunded = ! empty($refundData['refunded']) || $registration->payment_status === 'refunded';

        $message = 'Your registration was not approved.';
        if ($refunded && $wasPaid) {
            $formatted = $refundData['formatted_amount'] ?? ('£' . number_format($amount, 2));
            $message = "Your registration was not approved. A refund of {$formatted} has been initiated to your original payment method. Refunds typically appear within 5–10 business days.";
        } elseif ($wasPaid) {
            $message = 'Your registration was not approved. Please contact support if you need help with your payment refund.';
        } elseif ($registration->rejection_reason) {
            $message .= ' Reason: ' . $registration->rejection_reason;
        }

        DB::table('notifications')->insert([
            'id'              => (string) Str::uuid(),
            'type'            => 'learner_announcement',
            'notifiable_type' => User::class,
            'notifiable_id'   => $learner->id,
            'data'            => json_encode([
                'title'            => 'Registration Declined: ' . $webinar->title,
                'message'          => $message,
                'description'      => $message,
                'type'             => 'webinar_rejection',
                'webinar_id'       => $webinar->id,
                'registration_id'  => $registration->id,
                'priority'         => 'high',
                'category'         => 'system',
                'payment_status'   => $registration->payment_status,
                'refund_processed' => $refunded,
                'is_bookmarked'    => false,
                'is_pinned'        => false,
                'author_name'      => 'Freedom Property Academy',
                'author_role'      => 'Admin',
                'author_avatar'    => 'FP',
            ]),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }
}
