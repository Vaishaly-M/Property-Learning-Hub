<?php

namespace App\Mail;

use App\Models\MentorSession;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SessionBookingConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public MentorSession $session) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Mentor Session Confirmed: ' . $this->session->subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.session-booking-confirmation',
            with: [
                'session' => $this->session,
                'mentorName' => $this->session->mentor->first_name . ' ' . $this->session->mentor->last_name,
                'studentName' => $this->session->student->first_name . ' ' . $this->session->student->last_name,
            ],
        );
    }
}
