<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
    <h2>Meeting Cancelled</h2>
    <p>Hi {{ $recipientName }},</p>
    <p>Your meeting with {{ config('services.microsoft.admin_name') }} has been cancelled.</p>

    <p style="margin: 1rem 0; padding: 0.75rem 1rem; background: #fee2e2; border-radius: 6px;">
        <strong>Cancelled meeting:</strong> {{ $meeting->formattedMeetingDateTime() }}
    </p>

    @include('emails.partials.meeting-booking-details', [
        'showParticipantDetails' => true,
        'showJoinLink' => false,
        'showManageLink' => false,
    ])
</body>
</html>
