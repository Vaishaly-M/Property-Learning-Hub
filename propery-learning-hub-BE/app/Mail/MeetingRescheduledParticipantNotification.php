<?php

namespace App\Mail;

use App\Models\PlatformMeeting;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MeetingRescheduledParticipantNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PlatformMeeting $meeting,
        public string $recipientName,
        public ?Carbon $previousStart = null,
        public ?Carbon $previousEnd = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Meeting Rescheduled — Updated Join Details',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.meeting-participant-rescheduled',
        );
    }
}
