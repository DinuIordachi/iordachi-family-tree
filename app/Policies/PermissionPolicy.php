<?php

namespace App\Policies;

use App\Enums\RolesEnum;
use App\Models\Permission;
use App\Models\User;
use App\Enums\PermissionsEnum;

class PermissionPolicy
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
            PermissionsEnum::PERMISSION_VIEW_ANY->value,
            PermissionsEnum::PERMISSION_VIEW->value,
            PermissionsEnum::PERMISSION_CREATE->value,
            PermissionsEnum::PERMISSION_UPDATE->value,
            PermissionsEnum::PERMISSION_DELETE->value,
            PermissionsEnum::ROLE_VIEW->value,
            PermissionsEnum::ROLE_CREATE->value,
            PermissionsEnum::ROLE_UPDATE->value,
        );
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User       $user
     * @param Permission $permission
     *
     * @return bool
     */
    public function view(User $user, Permission $permission): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasAnyPermission(
            PermissionsEnum::PERMISSION_VIEW->value,
            PermissionsEnum::PERMISSION_CREATE->value,
            PermissionsEnum::PERMISSION_UPDATE->value,
            PermissionsEnum::PERMISSION_DELETE->value,
            PermissionsEnum::ROLE_VIEW->value,
            PermissionsEnum::ROLE_CREATE->value,
            PermissionsEnum::ROLE_UPDATE->value,
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

        return $user->hasPermissionTo(PermissionsEnum::PERMISSION_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User       $user
     * @param Permission $permission
     *
     * @return bool
     */
    public function update(User $user, Permission $permission): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERMISSION_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User       $user
     * @param Permission $permission
     *
     * @return bool
     */
    public function delete(User $user, Permission $permission): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($permission->inUse()) {
            return false;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERMISSION_DELETE->value);
    }
}
