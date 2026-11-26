<?php

namespace App\Mail;

use App\Models\Webinar;
use App\Models\WebinarRegistration;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WebinarRegistrationRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array{refunded?: bool, formatted_amount?: string, refund_amount?: string}  $refundData
     */
    public function __construct(
        public Webinar $webinar,
        public WebinarRegistration $registration,
        public array $refundData = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Webinar registration update: ' . $this->webinar->title,
        );
    }

    public function content(): Content
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        return new Content(
            view: 'emails.webinar-registration-rejected',
            with: [
                'webinar' => $this->webinar,
                'registration' => $this->registration,
                'refundData' => $this->refundData,
                'webinarsUrl' => $frontendUrl . '/learn?tab=webinars',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
