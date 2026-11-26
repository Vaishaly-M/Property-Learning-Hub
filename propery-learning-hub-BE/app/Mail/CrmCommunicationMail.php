<?php

namespace App\Mail;

use App\Models\Communication;
use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CrmCommunicationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Communication $communication,
        public Contact $contact
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->replaceMergeTokens($this->communication->subject);
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $processedBody = $this->replaceMergeTokens($this->communication->body);

        return new Content(
            view: 'emails.crm.communication',
            with: [
                'subject'   => $this->communication->subject,
                'body'      => $processedBody,
                'isHtml'    => $this->isHtmlContent($processedBody),
                'contact'   => $this->contact,
                'type'      => $this->communication->type,
            ],
        );
    }

    private function replaceMergeTokens(string $text): string
    {
        $replacements = [
            '{{first_name}}'   => $this->contact->first_name ?? 'Member',
            '{{last_name}}'    => $this->contact->last_name ?? '',
            '{{email}}'        => $this->contact->email ?? '',
            '{{company_name}}' => $this->contact->company_name ?? 'Freedom Property Education',
        ];

        return strtr($text, $replacements);
    }

    private function isHtmlContent(string $content): bool
    {
        return $content !== strip_tags($content);
    }

    public function attachments(): array
    {
        return [];
    }
}
