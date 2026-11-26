@extends('emails.layouts.academy')

@section('title', 'Verify Your Email — Freedom Property Academy')

@section('content')
    <p style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;line-height:1.3;">
        Hello, {{ $user->first_name }}!
    </p>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;">
        Your account is confirmed. Please verify your email address below to activate your account and log in.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
        <tr>
            <td style="padding:18px 22px;">
                <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
                    <strong>Action required:</strong> Your account won't be fully active until you verify this email address.
                </p>
            </td>
        </tr>
    </table>

    @include('emails.partials.button', ['url' => $url, 'label' => 'Verify email address'])

    @if(!empty($setPasswordUrl))
    <p style="margin:24px 0 8px;color:#334155;font-size:15px;line-height:1.7;font-weight:600;text-align:center;">
        Set your login password
    </p>
    <p style="margin:0 0 4px;color:#64748b;font-size:13px;line-height:1.6;text-align:center;">
        Create your academy password using the secure link below.
    </p>

    @include('emails.partials.button', ['url' => $setPasswordUrl, 'label' => 'Set your password'])
    @endif

    <p style="margin:24px 0 8px;color:#64748b;font-size:13px;line-height:1.6;text-align:center;">
        This link is unique to your account. If you did not create an account, you can safely ignore this email.
    </p>

    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
        If the button doesn't work, copy this link into your browser:<br>
        <a href="{{ $url }}" style="color:#2563eb;word-break:break-all;">{{ $url }}</a>
    </p>
@endsection