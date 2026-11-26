<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $agreement->documentTitle() }}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
    @php
        $title = $agreement->documentTitle();
        $isFree = $agreement->isFreeMembership();
    @endphp
    <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">{{ $title }}</h1>
        <p style="margin-top: 0; color: #475569;">
            Freedom Property Academy — Agreement #{{ $agreement->id }}
            @if ($isFree)
                · Free membership
            @endif
        </p>

        @if ($audience === 'admin')
            <p>
                The {{ $title }} for
                <strong>{{ $agreement->client_full_name }}</strong>
                ({{ $agreement->client_email }}) has been fully signed by the client and the Academy.
            </p>
        @else
            <p>
                Dear {{ $agreement->client_full_name }},
            </p>
            <p>
                Your {{ $title }} with Freedom Property Academy has been
                fully signed by both parties. A PDF copy is attached for your records.
            </p>
        @endif

        <ul style="padding-left: 18px; color: #334155;">
            <li>Client signed: {{ $agreement->client_signed_at?->timezone(config('app.timezone'))->format('d M Y H:i') }}</li>
            <li>Academy signed: {{ $agreement->admin_signed_at?->timezone(config('app.timezone'))->format('d M Y H:i') }}</li>
        </ul>

        <p style="color: #64748b; font-size: 13px;">
            Please keep this email and the attached PDF for your records.
        </p>
    </div>
</body>
</html>
