<?php

namespace App\Policies;

use App\Models\Garage;
use App\Models\User;
use App\Enums\PermissionsEnum;

class GaragePolicy
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
            PermissionsEnum::GARAGE_VIEW_ANY->value,
            PermissionsEnum::GARAGE_VIEW->value,
            PermissionsEnum::GARAGE_CREATE->value,
            PermissionsEnum::GARAGE_UPDATE->value,
            PermissionsEnum::GARAGE_DELETE->value,
        );
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User   $user
     * @param Garage $garage
     *
     * @return bool
     */
    public function view(User $user, Garage $garage): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasAnyPermission(
            PermissionsEnum::GARAGE_VIEW->value,
            PermissionsEnum::GARAGE_CREATE->value,
            PermissionsEnum::GARAGE_UPDATE->value,
            PermissionsEnum::GARAGE_DELETE->value,
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

        return $user->hasPermissionTo(PermissionsEnum::GARAGE_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User   $user
     * @param Garage $garage
     *
     * @return bool
     */
    public function update(User $user, Garage $garage): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::GARAGE_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User   $user
     * @param Garage $garage
     *
     * @return bool
     */
    public function delete(User $user, Garage $garage): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::GARAGE_DELETE->value);
    }
}
