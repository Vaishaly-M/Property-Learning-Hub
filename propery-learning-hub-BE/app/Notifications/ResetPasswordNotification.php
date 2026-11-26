<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Lang;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public $token;
    public $url;

    /**
     * Create a new notification instance.
     */
    public function __construct($token, $url = null)
    {
        $this->token = $token;
        $this->url = $url ?? config('app.frontend_url') . '/reset-password';
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
   public function toMail(object $notifiable): MailMessage
{
    return (new MailMessage)
        ->subject('Reset Your Password')
        ->view('emails.password-reset', [
            'resetUrl' => url("{$this->url}?token={$this->token}&email=" . urlencode($notifiable->email))
        ]);
}

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}