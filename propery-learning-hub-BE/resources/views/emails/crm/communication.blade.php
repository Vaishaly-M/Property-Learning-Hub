@if (!empty($isHtml))
    {!! $body !!}
@else
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>{{ $subject }}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Hi {{ $contact->first_name }},</p>
        <div style="white-space: pre-wrap;">{!! nl2br(e($body)) !!}</div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #888;">Freedom Property Academy</p>
    </body>
    </html>
@endif
