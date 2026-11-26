<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Webinar Follow-Up</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <p>Hi {{ $contact->first_name }},</p>
    @if($attended)
    <p>Thank you for attending <strong>{{ $webinar->title }}</strong>. We hope you found it valuable.</p>
    <p>Ready to take the next step? Explore our courses and membership options on the Freedom Property Academy portal.</p>
    @else
    <p>We noticed you weren't able to join <strong>{{ $webinar->title }}</strong>.</p>
    <p>Don't worry — we'd love to help you catch up. Reply to this email or book a discovery call to learn more.</p>
    @endif
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #888;">Freedom Property Academy</p>
</body>
</html>
