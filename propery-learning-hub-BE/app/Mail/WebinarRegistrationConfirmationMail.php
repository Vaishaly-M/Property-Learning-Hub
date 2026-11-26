<?php

namespace App\Mail;

use App\Models\Contact;
use App\Models\Webinar;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WebinarRegistrationConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Webinar $webinar,
        public Contact $contact
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Registration confirmed: {$this->webinar->title}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.crm.webinar-confirmation',
            with: [
                'webinar' => $this->webinar,
                'contact' => $this->contact,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
