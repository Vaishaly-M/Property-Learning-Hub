<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClarityFetchFailedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $errorMessage,
        public ?string $snapshotDate = null,
        public array $context = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Clarity daily fetch failed — ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.clarity-fetch-failed',
        );
    }
}
