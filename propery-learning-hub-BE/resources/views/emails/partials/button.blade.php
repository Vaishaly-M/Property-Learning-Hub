@php
    $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
@endphp
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
    <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);">
            <a href="{{ $url }}" target="_blank" style="display:inline-block;padding:15px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1.2;letter-spacing:0.2px;">
                {{ $label }}
            </a>
        </td>
    </tr>
</table>
