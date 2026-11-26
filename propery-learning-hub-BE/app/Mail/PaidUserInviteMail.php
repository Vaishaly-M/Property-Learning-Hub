<?php

namespace App\Mail;

use App\Models\PaidUserInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaidUserInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $inviteUrl;

    public string $expiresAtFormatted;

    public function __construct(public PaidUserInvite $invite)
    {
        $this->inviteUrl = $invite->inviteUrl();
        $this->expiresAtFormatted = $invite->expires_at
            ->timezone(config('app.timezone', 'Europe/London'))
            ->format('l, j F Y \a\t g:i A');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Freedom Property Academy Registration Invitation',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.paid-user-invite',
            with: [
                'invite' => $this->invite,
                'inviteUrl' => $this->inviteUrl,
                'expiresAtFormatted' => $this->expiresAtFormatted,
            ],
        );
    }
}
