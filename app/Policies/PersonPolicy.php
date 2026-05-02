<?php

namespace App\Policies;

use App\Models\Person;
use App\Models\User;
use App\Enums\PermissionsEnum;

class PersonPolicy
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
     * Determine whether the user can view any models.
     *
     * @param User $user
     *
     * @return bool
     */
    public function viewAny(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasAnyPermission(
            PermissionsEnum::PERSON_VIEW_ANY->value,
            PermissionsEnum::PERSON_VIEW->value,
            PermissionsEnum::PERSON_CREATE->value,
            PermissionsEnum::PERSON_UPDATE->value,
            PermissionsEnum::PERSON_DELETE->value,
        );
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User   $user
     * @param Person $person
     *
     * @return bool
     */
    public function view(User $user, Person $person): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasAnyPermission(
            PermissionsEnum::PERSON_VIEW->value,
            PermissionsEnum::PERSON_CREATE->value,
            PermissionsEnum::PERSON_UPDATE->value,
            PermissionsEnum::PERSON_DELETE->value,
        );
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

        return $user->hasPermissionTo(PermissionsEnum::PERSON_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User   $user
     * @param Person $person
     *
     * @return bool
     */
    public function update(User $user, Person $person): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERSON_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User   $user
     * @param Person $person
     *
     * @return bool
     */
    public function delete(User $user, Person $person): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERSON_DELETE->value);
    }
}
