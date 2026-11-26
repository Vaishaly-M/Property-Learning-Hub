<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Rescheduled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
    <h2>Meeting Rescheduled</h2>
    <p>Hi {{ $recipientName }},</p>
    <p>Your meeting with {{ config('services.microsoft.admin_name') }} has been rescheduled. Please use the updated details and join link below.</p>

    <p style="margin: 1rem 0; padding: 0.75rem 1rem; background: #dbeafe; border-radius: 6px;">
        <strong>New time:</strong> {{ $meeting->formattedMeetingDateTime() }}
    </p>

    @if($previousStart && $previousEnd)
    <p style="margin: 1rem 0; padding: 0.75rem 1rem; background: #fef3c7; border-radius: 6px;">
        <strong>Previous time:</strong> {{ $meeting->formattedTimeRangeFor($previousStart, $previousEnd) }}
    </p>
    @endif

    @include('emails.partials.meeting-booking-details', ['showParticipantDetails' => true])
</body>
</html>
