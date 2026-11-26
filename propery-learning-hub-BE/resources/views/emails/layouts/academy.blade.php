@php
    $appName = config('app.name', 'Freedom Property Academy');
    $year = date('Y');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('title', $appName)</title>
</head>
<body style="margin:0;padding:0;background-color:#eff6ff;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 8px 32px rgba(37,99,235,0.10);">
                    <tr>
                        <td style="padding:40px;">
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background-color:#f8fafc;padding:28px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0 0 6px;color:#64748b;font-size:13px;line-height:1.6;">
                                &copy; {{ $year }} {{ $appName }}. All rights reserved.
                            </p>
                            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                                Learn proven property investment strategies with confidence.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
