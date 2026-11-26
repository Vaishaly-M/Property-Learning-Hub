<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Meeting Scheduled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
    <h2>New Meeting Scheduled</h2>
    <p>A new session has been scheduled on your calendar.</p>

    <p style="margin: 1rem 0; padding: 0.75rem 1rem; background: #ecfdf5; border-radius: 6px;">
        <strong>Scheduled for:</strong> {{ $meeting->formattedMeetingDateTime() }}
    </p>

    @include('emails.partials.meeting-booking-details', [
        'showParticipantDetails' => true,
        'detailsHeading' => 'Participant details',
    ])
</body>
</html>
