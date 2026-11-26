<?php

namespace App\Mail;

use App\Models\TrainingAgreement;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TrainingAgreementCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public TrainingAgreement $agreement,
        public string $pdfBinary,
        public string $pdfFilename,
        public string $audience = 'client',
    ) {}

    public function envelope(): Envelope
    {
        $title = $this->agreement->isFreeMembership()
            ? 'Free Membership Agreement'
            : 'Training Agreement';

        $subject = $this->audience === 'admin'
            ? $title . ' fully signed — ' . $this->agreement->client_full_name
            : 'Your Freedom Property Academy ' . $title . ' (signed)';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.training-agreement-completed',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBinary, $this->pdfFilename)
                ->withMime('application/pdf'),
        ];
    }
}
