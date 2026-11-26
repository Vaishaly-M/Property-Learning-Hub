<?php

namespace App\Policies;

use App\Models\ContractTemplate;
use App\Models\User;

class ContractTemplatePolicy
{
    /** Any authenticated user can view the list */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Can view if: global template OR owner OR purchased */
    public function view(User $user, ContractTemplate $template): bool
    {
        return $template->is_global
            || $template->isOwnedBy($user->id)
            || $template->isPurchasedBy($user->id);
    }

    /** Only the creator can update */
    public function update(User $user, ContractTemplate $template): bool
    {
        return $template->isOwnedBy($user->id);
    }

    /** Only the creator can delete */
    public function delete(User $user, ContractTemplate $template): bool
    {
        return $template->isOwnedBy($user->id);
    }

    /** Can download if purchased (or free / own template) */
    public function download(User $user, ContractTemplate $template): bool
    {
        return $template->isPurchasedBy($user->id);
    }
}