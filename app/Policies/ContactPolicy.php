<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;
use App\Enums\PermissionsEnum;

class ContactPolicy
{
    /**
     * Perform post-authorization checks.
     */
    public function before(?User $user, string $ability): bool|null
    {
        if (! $user) {
            return false;
        }

        if (! $user->hasVerifiedEmail() || $user->isBlocked()) {
            return false;
        }

        if (! $user->hasPermissionTo(PermissionsEnum::DASHBOARD_VIEW->value)) {
            return false;
        }

        return null;
    }

    /**
     * Determine whether the user can create models.
     *
     * @param User $user
     *
     * @return bool
     */
    public function create(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::CONTACT_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User    $user
     * @param Contact $contact
     *
     * @return bool
     */
    public function update(User $user, Contact $contact): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::CONTACT_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User    $user
     * @param Contact $contact
     *
     * @return bool
     */
    public function delete(User $user, Contact $contact): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::CONTACT_DELETE->value);
    }
}
