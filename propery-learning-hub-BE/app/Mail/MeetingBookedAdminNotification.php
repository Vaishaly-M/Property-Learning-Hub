<?php

namespace App\Mail;

use App\Models\PlatformMeeting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MeetingBookedAdminNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public PlatformMeeting $meeting) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Meeting Scheduled',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.meeting-admin-notification',
        );
    }
}
