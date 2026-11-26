<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailNotification extends Notification
{
    public function __construct(
        public ?string $setPasswordUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
        $hash = sha1($notifiable->getEmailForVerification());
        $url = rtrim($frontendUrl, '/') . '/verify-email?id=' . $notifiable->getKey() . '&hash=' . $hash;

        return (new MailMessage)
            ->subject('Verify Your Email — Freedom Property Academy')
            ->view('emails.verify-email', [
                'user' => $notifiable,
                'url' => $url,
                'setPasswordUrl' => $this->setPasswordUrl,
            ]);
    }
}
