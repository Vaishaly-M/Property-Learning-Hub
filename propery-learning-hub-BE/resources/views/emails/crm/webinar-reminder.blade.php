<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Webinar Reminder</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    @php
        $joinUrl = $webinar->zoom_join_url ?: $webinar->live_link;
    @endphp
    <h2 style="color: #1e40af;">Webinar starting soon</h2>
    <p>Hi {{ $contact->first_name }},</p>
    <p>This is a reminder that <strong>{{ $webinar->title }}</strong> is coming up.</p>
    <p><strong>Date:</strong> {{ $webinar->date }}<br>
    <strong>Time:</strong> {{ $webinar->time }}</p>
    @if($joinUrl)
    <p><a href="{{ $joinUrl }}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Webinar</a></p>
    @endif
    @if($webinar->zoom_password)
    <p><strong>Passcode:</strong> {{ $webinar->zoom_password }}</p>
    @endif
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #888;">Freedom Property Academy</p>
</body>
</html>
