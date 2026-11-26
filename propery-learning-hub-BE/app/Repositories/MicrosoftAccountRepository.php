<?php

namespace App\Repositories;

use App\Models\MicrosoftAccount;
use App\Models\User;

class MicrosoftAccountRepository
{
    public function findByUserId(int $userId): ?MicrosoftAccount
    {
        return MicrosoftAccount::where('user_id', $userId)->first();
    }

    public function upsertForUser(User $user, array $data): MicrosoftAccount
    {
        return MicrosoftAccount::updateOrCreate(
            ['user_id' => $user->id],
            $data
        );
    }

    public function deleteForUser(User $user): bool
    {
        return (bool) MicrosoftAccount::where('user_id', $user->id)->delete();
    }
}
