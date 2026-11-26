<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLoginStreak extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'last_login_date',
        'current_streak',
        'longest_streak',
        'login_dates',
    ];

    protected $casts = [
        'last_login_date' => 'date',
        'login_dates' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recordLogin(): void
    {
        $today = now()->toDateString();
        $loginDates = $this->login_dates ?? [];

        if (!in_array($today, $loginDates, true)) {
            $loginDates[] = $today;
            $this->login_dates = $loginDates;
        }

        $yesterday = now()->subDay()->toDateString();
        $lastLogin = $this->last_login_date?->toDateString();

        if ($lastLogin === $yesterday) {
            $this->current_streak += 1;
        } elseif ($lastLogin !== $today) {
            $this->current_streak = 1;
        }

        if ($this->current_streak > ($this->longest_streak ?? 0)) {
            $this->longest_streak = $this->current_streak;
        }

        $this->last_login_date = $today;
        $this->save();
    }
}
