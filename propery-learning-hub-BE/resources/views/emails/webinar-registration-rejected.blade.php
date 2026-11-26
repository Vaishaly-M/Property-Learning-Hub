@extends('emails.layouts.academy')

@section('title', 'Webinar Registration Update — ' . $webinar->title)

@section('content')
    @php
        $refunded = !empty($refundData['refunded']);
        $formattedAmount = $refundData['formatted_amount']
            ?? (isset($refundData['refund_amount']) ? '£' . number_format((float) $refundData['refund_amount'], 2) : null)
            ?? ($registration->amount_paid ? '£' . number_format((float) $registration->amount_paid, 2) : null);
        $wasPaid = $refunded || (
            in_array($registration->payment_status, ['paid', 'refunded'], true)
            && (float) ($registration->amount_paid ?? 0) > 0
        );
    @endphp

    <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7;">
        Unfortunately, your registration for
        <strong style="color:#1e293b;">{{ $webinar->title }}</strong>
        was not approved.
    </p>

    @if($registration->rejection_reason)
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;">
            <tr>
                <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#991b1b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Reason</p>
                    <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.6;">{{ $registration->rejection_reason }}</p>
                </td>
            </tr>
        </table>
    @endif

    @if($refunded && $formattedAmount)
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
            <tr>
                <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Refund</p>
                    <p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;">
                        A refund of <strong>{{ $formattedAmount }}</strong> has been initiated to your original payment method.
                        Refunds typically appear within 5–10 business days.
                    </p>
                </td>
            </tr>
        </table>
    @elseif($wasPaid)
        <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.7;">
            If you made a payment for this webinar, please contact support so we can assist with your refund.
        </p>
    @endif

    <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.7;">
        You may register again from your webinars page if spots are still available.
    </p>

    @include('emails.partials.button', [
        'url' => $webinarsUrl,
        'label' => 'View Webinars',
    ])
@endsection
