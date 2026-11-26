<?php

namespace App\Mail;

use App\Models\PlatformMeeting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MeetingBookedParticipantConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PlatformMeeting $meeting,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Meeting Confirmation',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.meeting-participant-confirmation',
        );
    }
}
