@extends('emails.layouts.academy')

@section('title', 'Your Free Registration Link — Freedom Property Academy')

@section('content')
    @include('emails.partials.success-banner', [
        'title' => 'You\'ve been invited to join',
        'subtitle' => 'Freedom Property Academy — free registration',
    ])

    <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7;">
        You have been invited to register for <strong style="color:#1e293b;">Freedom Property Academy</strong>
        at no cost. Use the button below to sign your training agreement and create your account.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr>
            <td style="padding:24px;">
                <p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Invite details</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Email</td>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">{{ $invite->email }}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0;color:#64748b;font-size:14px;">Expires</td>
                        <td style="padding:10px 0;color:#1e293b;font-size:14px;text-align:right;">{{ $expiresAtFormatted }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto;">
        <tr>
            <td style="border-radius:10px;background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);">
                <a href="{{ $inviteUrl }}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;">
                    Register for free
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
        This link is valid for <strong>7 days</strong>, can only be used <strong>once</strong>,
        and only works with the email address above.
    </p>

    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;word-break:break-all;">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="{{ $inviteUrl }}" style="color:#2563eb;">{{ $inviteUrl }}</a>
    </p>
@endsection
