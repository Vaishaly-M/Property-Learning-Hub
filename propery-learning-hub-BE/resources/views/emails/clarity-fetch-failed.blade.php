<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Clarity Fetch Failed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
    <h2>Clarity daily fetch failed</h2>

    <p>The scheduled Clarity analytics job did not complete successfully.</p>

    @if ($snapshotDate)
        <p><strong>Snapshot date:</strong> {{ $snapshotDate }}</p>
    @endif

    <p style="margin: 1rem 0; padding: 0.75rem 1rem; background: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
        <strong>Error:</strong> {{ $errorMessage }}
    </p>

    @if (!empty($context))
        <pre style="background: #f8fafc; padding: 1rem; border-radius: 6px; font-size: 12px; overflow-x: auto;">{{ json_encode($context, JSON_PRETTY_PRINT) }}</pre>
    @endif

    <p style="color: #64748b; font-size: 13px;">
        Scheduled time: 11:55 PM {{ config('clarity.timezone', 'Europe/London') }} daily.<br>
        Check <code>storage/logs/clarity-fetch.log</code> and Laravel logs for more detail.
    </p>
</body>
</html>
