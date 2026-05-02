<?php

namespace App\Policies;

use App\Models\Association;
use App\Models\User;
use App\Enums\PermissionsEnum;

class AssociationPolicy
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
            PermissionsEnum::ASSOCIATION_VIEW_ANY->value,
            PermissionsEnum::ASSOCIATION_VIEW->value,
            PermissionsEnum::ASSOCIATION_CREATE->value,
            PermissionsEnum::ASSOCIATION_UPDATE->value,
            PermissionsEnum::ASSOCIATION_DELETE->value,
        );
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User        $user
     * @param Association $association
     *
     * @return bool
     */
    public function view(User $user, Association $association): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasAnyPermission(
            PermissionsEnum::ASSOCIATION_VIEW->value,
            PermissionsEnum::ASSOCIATION_CREATE->value,
            PermissionsEnum::ASSOCIATION_UPDATE->value,
            PermissionsEnum::ASSOCIATION_DELETE->value,
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

        return $user->hasPermissionTo(PermissionsEnum::ASSOCIATION_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User        $user
     * @param Association $association
     *
     * @return bool
     */
    public function update(User $user, Association $association): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::ASSOCIATION_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User        $user
     * @param Association $association
     *
     * @return bool
     */
    public function delete(User $user, Association $association): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::ASSOCIATION_DELETE->value);
    }
}
