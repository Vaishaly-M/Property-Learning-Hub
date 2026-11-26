<?php

namespace App\Mail;

use App\Models\AcademyPayment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentSuccessMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $formattedAmount;

    public function __construct(
        public AcademyPayment $payment,
        public ?User $user = null,
        public ?string $setPasswordUrl = null,
    ) {
        $currency = $payment->currency ?: 'gbp';
        $symbol = strtoupper($currency) === 'GBP' ? '£' : strtoupper($currency) . ' ';
        $this->formattedAmount = $symbol . number_format($payment->amount / 100, 2);
    }

    public function envelope(): Envelope
    {
        $subject = $this->user
            ? 'Payment Received & Account Created — Freedom Property Academy'
            : 'Payment Received — Freedom Property Academy';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-success',
        );
    }
}
