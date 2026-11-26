<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\CanResetPassword;
use App\Notifications\ResetPasswordNotification;

class User extends Authenticatable implements CanResetPassword
{
    use Notifiable;

    /**
     * Send the password reset notification.
     */
    public function sendPasswordResetNotification($token)
    {
        // Use custom notification if exists
        if (class_exists(ResetPasswordNotification::class)) {
            $this->notify(new ResetPasswordNotification($token));
        } else {
            $this->notify(new \Illuminate\Auth\Notifications\ResetPassword($token));
        }
    }
}