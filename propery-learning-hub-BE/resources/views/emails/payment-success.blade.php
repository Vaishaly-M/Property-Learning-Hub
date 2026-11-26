@extends('emails.layouts.academy')

@section('title', $user ? 'Payment Received & Account Created — Freedom Property Academy' : 'Payment Received — Freedom Property Academy')

@section('content')
    @php
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $loginUrl = $frontendUrl . '/login';
        $productName = config('services.stripe.academy_product_name', 'Freedom Property Journey');
    @endphp

    @include('emails.partials.success-banner', [
        'title' => $user ? 'Payment received & account created' : 'Payment successful',
        'subtitle' => $user
            ? 'Welcome to Freedom Property Academy, ' . $user->first_name . '!'
            : 'Your place in the academy is secured.',
    ])

    @if($user)
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7;">
            Thank you for joining <strong style="color:#1e293b;">{{ $productName }}</strong>.
            Your payment has been received and your academy account is ready.
            Please verify your email address using the separate email we just sent —
            you&apos;ll need to confirm it before you can log in.
        </p>
    @else
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7;">
            Thank you for your payment for <strong style="color:#1e293b;">{{ $productName }}</strong>.
            We&apos;re excited to have you join the Freedom Property Academy community.
        </p>
    @endif

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr>
            <td style="padding:24px;">
                <p style="margin:0 0 16px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Payment details</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Amount paid</td>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">{{ $formattedAmount }}</td>
                    </tr>
                    @if($payment->paid_at)
                    <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Date</td>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;text-align:right;">{{ $payment->paid_at->timezone('Europe/London')->format('l, j F Y') }}<br><span style="color:#64748b;font-size:13px;">{{ $payment->paid_at->timezone('Europe/London')->format('g:i A') }} (UK)</span></td>
                    </tr>
                    @endif
                    @if($user)
                    <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Account email</td>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;text-align:right;">{{ $user->email }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding:10px 0;color:#64748b;font-size:14px;">Reference</td>
                        <td style="padding:10px 0;color:#475569;font-size:12px;font-family:Consolas,Monaco,monospace;text-align:right;word-break:break-all;">{{ $payment->stripe_payment_intent_id }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    @if($user)
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
            <tr>
                <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;color:#1e40af;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Your membership includes</p>
                    <p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">
                        Weekly live meetings &bull; Personal mentorship &bull; Full community access<br>
                        Templates & contracts &bull; Live Q&amp;A &bull; Priority support
                    </p>
                </td>
            </tr>
        </table>

        <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.7;font-weight:600;">
            Next step — verify your email
        </p>
        <p style="margin:0 0 4px;color:#64748b;font-size:14px;line-height:1.7;">
            Check your inbox for a verification email. Once confirmed, you can log in and access your dashboard.
        </p>

        @include('emails.partials.button', ['url' => $loginUrl, 'label' => 'Go to login'])

        @if(!empty($setPasswordUrl))
        <p style="margin:24px 0 8px;color:#334155;font-size:15px;line-height:1.7;font-weight:600;">
            Set or update your password
        </p>
        <p style="margin:0 0 4px;color:#64748b;font-size:14px;line-height:1.7;">
            Use the link below to set your academy login password if you have not done so already.
        </p>

        @include('emails.partials.button', ['url' => $setPasswordUrl, 'label' => 'Set your password'])
        @endif

        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
            We look forward to supporting your property journey.<br>
            <strong style="color:#64748b;">The Freedom Property Academy Team</strong>
        </p>
    @else
        <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.7;font-weight:600;">
            Next step — create your account
        </p>
        <p style="margin:0 0 4px;color:#64748b;font-size:14px;line-height:1.7;">
            Complete your registration and set your login password to unlock full academy access, live sessions, and community features.
        </p>

        @php
            $accountUrl = $frontendUrl . '/payment/success?payment_intent=' . $payment->stripe_payment_intent_id;
        @endphp

        @include('emails.partials.button', ['url' => $accountUrl, 'label' => 'Complete registration & set password'])

        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
            If the button doesn&apos;t work, copy this link:<br>
            <a href="{{ $accountUrl }}" style="color:#2563eb;word-break:break-all;">{{ $accountUrl }}</a>
        </p>
    @endif
@endsection
