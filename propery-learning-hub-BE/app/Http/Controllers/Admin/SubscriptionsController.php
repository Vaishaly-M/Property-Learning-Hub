<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademyPayment;
use App\Services\Payments\StripeAcademyPaymentService;
use Illuminate\Http\Request;

class SubscriptionsController extends Controller
{
    public function index(Request $request, StripeAcademyPaymentService $payments)
    {
        $config = $payments->getPublicConfig();
        $search = trim((string) $request->query('search', ''));
        $status = $request->query('status');
        $range = $request->query('range', '30days');
        $tab = $request->query('tab', 'overview');

        $startDate = match ($range) {
            '7days' => now()->subDays(7),
            '90days' => now()->subDays(90),
            '1year' => now()->subYear(),
            'all' => null,
            default => now()->subDays(30),
        };

        $paidStatuses = ['paid', 'consumed'];

        $revenueQuery = $this->academyPaymentsQuery()->whereIn('status', $paidStatuses);
        $totalRevenue = (int) (clone $revenueQuery)->sum('amount');

        $enrolledCount = $this->academyPaymentsQuery()->where('status', 'consumed')->count();
        $paidAwaitingRegistration = $this->academyPaymentsQuery()->where('status', 'paid')->count();
        $pendingCount = $this->academyPaymentsQuery()->where('status', 'pending')->count();
        $failedCount = $this->academyPaymentsQuery()->where('status', 'failed')->count();

        $rangeRevenue = $startDate
            ? (int) (clone $revenueQuery)->where('paid_at', '>=', $startDate)->sum('amount')
            : $totalRevenue;

        $periodDays = match ($range) {
            '7days' => 7,
            '90days' => 90,
            '1year' => 365,
            default => 30,
        };

        $previousRevenue = $startDate
            ? (int) $this->academyPaymentsQuery()
                ->whereIn('status', $paidStatuses)
                ->where('paid_at', '>=', $startDate->copy()->subDays($periodDays))
                ->where('paid_at', '<', $startDate)
                ->sum('amount')
            : 0;

        $revenueChange = $this->growthPercent($previousRevenue, $rangeRevenue);

        $enrollmentsQuery = $this->academyPaymentsQuery()
            ->with('user')
            ->where('status', 'consumed')
            ->orderByDesc('paid_at');

        if ($search !== '') {
            $enrollmentsQuery->where(function ($q) use ($search) {
                $q->where('customer_email', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $paymentsQuery = $this->academyPaymentsQuery()
            ->with('user')
            ->orderByDesc('created_at');

        if ($startDate) {
            $paymentsQuery->where('created_at', '>=', $startDate);
        }

        if ($status && $status !== 'all') {
            $paymentsQuery->where('status', $status);
        }

        if ($search !== '') {
            $paymentsQuery->where(function ($q) use ($search) {
                $q->where('customer_email', 'like', "%{$search}%")
                    ->orWhere('stripe_payment_intent_id', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $limit = min((int) $request->query('limit', 50), 100);

        return response()->json([
            'success' => true,
            'data' => [
                'plan' => [
                    'name' => $config['product_name'],
                    'amount' => $config['amount'],
                    'currency' => $config['currency'],
                    'formatted_amount' => $config['formatted_amount'],
                    'billing_type' => 'one_time',
                    'enrolled_count' => $enrolledCount,
                    'paid_awaiting_registration' => $paidAwaitingRegistration,
                    'features' => [
                        'Weekly Live Meetings',
                        'Live Personal Mentorship',
                        'Full Community Access',
                        'Networking Opportunities',
                        'Bonus Content & Updates',
                        'Templates & Contracts',
                        'Live Q&A Sessions',
                        'Priority Support',
                    ],
                ],
                'stats' => [
                    'total_revenue' => [
                        'value' => $totalRevenue,
                        'formatted' => $this->formatMoney($totalRevenue, $config['currency']),
                        'change' => $revenueChange,
                    ],
                    'enrolled_members' => [
                        'value' => $enrolledCount,
                        'change' => null,
                    ],
                    'pending_payments' => [
                        'value' => $pendingCount,
                        'change' => null,
                    ],
                    'failed_payments' => [
                        'value' => $failedCount,
                        'change' => null,
                    ],
                    'range_revenue' => [
                        'value' => $rangeRevenue,
                        'formatted' => $this->formatMoney($rangeRevenue, $config['currency']),
                        'range' => $range,
                    ],
                    'success_rate' => $this->successRate(),
                ],
                'enrollments' => $enrollmentsQuery->limit($limit)->get()->map(
                    fn (AcademyPayment $payment) => $this->formatEnrollment($payment, $config)
                ),
                'payments' => $paymentsQuery->limit($limit)->get()->map(
                    fn (AcademyPayment $payment) => $this->formatPayment($payment, $config)
                ),
                'recent_payments' => $this->academyPaymentsQuery()
                    ->with('user')
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->get()
                    ->map(fn (AcademyPayment $payment) => $this->formatPayment($payment, $config)),
            ],
        ]);
    }

    private function formatEnrollment(AcademyPayment $payment, array $config): array
    {
        $user = $payment->user;
        $name = $user
            ? trim("{$user->first_name} {$user->last_name}")
            : ($payment->customer_email ?? 'Unknown');

        return [
            'id' => $payment->id,
            'customer' => $name,
            'email' => $user?->email ?? $payment->customer_email,
            'plan' => $config['product_name'],
            'amount' => $payment->amount,
            'formatted_amount' => $this->formatMoney($payment->amount, $payment->currency),
            'status' => $payment->status,
            'enrolled_at' => $payment->paid_at?->toIso8601String(),
            'user_id' => $payment->user_id,
            'payment_intent_id' => $payment->stripe_payment_intent_id,
        ];
    }

    private function formatPayment(AcademyPayment $payment, array $config): array
    {
        $user = $payment->user;
        $name = $user
            ? trim("{$user->first_name} {$user->last_name}")
            : ($payment->customer_email ?? '—');

        return [
            'id' => $payment->id,
            'transaction_id' => $payment->stripe_payment_intent_id ?? "PAY-{$payment->id}",
            'customer' => $name,
            'email' => $user?->email ?? $payment->customer_email,
            'plan' => $config['product_name'],
            'amount' => $payment->amount,
            'formatted_amount' => $this->formatMoney($payment->amount, $payment->currency),
            'status' => $this->mapPaymentStatus($payment->status),
            'raw_status' => $payment->status,
            'date' => ($payment->paid_at ?? $payment->created_at)?->toIso8601String(),
            'user_id' => $payment->user_id,
        ];
    }

    private function mapPaymentStatus(string $status): string
    {
        return match ($status) {
            'paid', 'consumed' => 'completed',
            'failed' => 'failed',
            'pending' => 'pending',
            default => $status,
        };
    }

    private function formatMoney(int $amountMinor, string $currency): string
    {
        $symbol = strtoupper($currency) === 'GBP' ? '£' : strtoupper($currency) . ' ';

        return $symbol . number_format($amountMinor / 100, 2);
    }

    private function growthPercent(int|float $previous, int|float $current): ?float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function successRate(): ?float
    {
        $total = $this->academyPaymentsQuery()
            ->whereIn('status', ['paid', 'consumed', 'failed'])
            ->count();

        if ($total === 0) {
            return null;
        }

        $successful = $this->academyPaymentsQuery()
            ->whereIn('status', ['paid', 'consumed'])
            ->count();

        return round(($successful / $total) * 100, 1);
    }

    private function academyPaymentsQuery()
    {
        return AcademyPayment::query()->academyEnrollment();
    }
}
