<?php

namespace App\Mail;

use App\Models\Contact;
use App\Models\Webinar;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WebinarFollowUpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Webinar $webinar,
        public Contact $contact,
        public bool $attended
    ) {}

    public function envelope(): Envelope
    {
        $suffix = $this->attended ? 'Thank you for attending' : 'We missed you';

        return new Envelope(subject: "{$suffix}: {$this->webinar->title}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.crm.webinar-follow-up',
            with: [
                'webinar'   => $this->webinar,
                'contact'   => $this->contact,
                'attended'  => $this->attended,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
