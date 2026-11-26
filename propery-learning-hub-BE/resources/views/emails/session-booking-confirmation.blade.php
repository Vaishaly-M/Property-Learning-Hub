<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Session Booking Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
    <h2>Your mentor session is confirmed</h2>
    <p>Hi {{ $studentName }},</p>
    <p>Your session with <strong>{{ $mentorName }}</strong> has been booked.</p>
    <ul>
        <li><strong>Subject:</strong> {{ $session->subject }}</li>
        <li><strong>Start:</strong> {{ $session->start_time->format('D, M j Y g:i A') }} ({{ $session->timezone }})</li>
        <li><strong>End:</strong> {{ $session->end_time->format('D, M j Y g:i A') }} ({{ $session->timezone }})</li>
    </ul>
    @if($session->join_url)
        <p><a href="{{ $session->join_url }}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">Join Microsoft Teams Meeting</a></p>
        <p>Or copy this link: {{ $session->join_url }}</p>
    @endif
    @if($session->description)
        <p><strong>Notes:</strong> {{ $session->description }}</p>
    @endif
    <p>Thank you,<br>Freedom Property Academy</p>
</body>
</html>
