@extends('emails.layouts.academy')

@section('title', 'Welcome — Freedom Property Academy')

@section('content')
    @php
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $loginUrl = $frontendUrl . '/login';
    @endphp

    <p style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;line-height:1.3;">
        Welcome, {{ $user->first_name }}!
    </p>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;">
        Your Freedom Property Academy account has been created successfully. You're one step away from full access.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr>
            <td style="padding:24px;">
                <p style="margin:0 0 16px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">What happens next</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="padding:0 0 16px;vertical-align:top;width:32px;">
                            <div style="width:28px;height:28px;background-color:#dbeafe;color:#1d4ed8;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">1</div>
                        </td>
                        <td style="padding:0 0 16px;vertical-align:top;">
                            <p style="margin:0;color:#1e293b;font-size:14px;font-weight:600;">Verify your email</p>
                            <p style="margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.5;">Check your inbox for a separate verification email and confirm your address.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 16px;vertical-align:top;width:32px;">
                            <div style="width:28px;height:28px;background-color:#dbeafe;color:#1d4ed8;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">2</div>
                        </td>
                        <td style="padding:0 0 16px;vertical-align:top;">
                            <p style="margin:0;color:#1e293b;font-size:14px;font-weight:600;">Log in to the academy</p>
                            <p style="margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.5;">Access your dashboard, live sessions, and member resources.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="vertical-align:top;width:32px;">
                            <div style="width:28px;height:28px;background-color:#dbeafe;color:#1d4ed8;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">3</div>
                        </td>
                        <td style="vertical-align:top;">
                            <p style="margin:0;color:#1e293b;font-size:14px;font-weight:600;">Start your property journey</p>
                            <p style="margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.5;">Explore mentorship, community access, and proven investment strategies.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
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

    @include('emails.partials.button', ['url' => $loginUrl, 'label' => 'Log in to the Academy'])

    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
        We look forward to supporting your property journey.<br>
        <strong style="color:#64748b;">The Freedom Property Academy Team</strong>
    </p>
@endsection
