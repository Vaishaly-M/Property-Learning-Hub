<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminMicrosoftConnection extends Model
{
    protected $fillable = [
        'microsoft_user_id',
        'email',
        'display_name',
        'access_token',
        'refresh_token',
        'expires_at',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'expires_at' => 'datetime',
        ];
    }

    public function expiresWithinMinutes(int $minutes = 5): bool
    {
        return $this->expires_at->lte(now()->addMinutes($minutes));
    }

    public static function current(): ?self
    {
        return static::query()->latest('id')->first();
    }
}
