<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
    <h2>Meeting Confirmation</h2>
    <p>Hi {{ $recipientName ?? $meeting->name }},</p>
    <p>Your meeting with {{ config('services.microsoft.admin_name') }} is confirmed.</p>

    <p style="margin: 1rem 0; padding: 0.75rem 1rem; background: #ecfdf5; border-radius: 6px;">
        <strong>Scheduled for:</strong> {{ $meeting->formattedMeetingDateTime() }}
    </p>

    @include('emails.partials.meeting-booking-details', ['showParticipantDetails' => true])

    <p style="margin-top: 1.5rem;">We look forward to speaking with you.</p>
</body>
</html>
