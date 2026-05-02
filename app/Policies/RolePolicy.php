<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;

class RolePolicy
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
            PermissionsEnum::ROLE_VIEW_ANY->value,
            PermissionsEnum::ROLE_VIEW->value,
            PermissionsEnum::ROLE_CREATE->value,
            PermissionsEnum::ROLE_UPDATE->value,
            PermissionsEnum::ROLE_DELETE->value,
            PermissionsEnum::PERMISSION_VIEW->value,
            PermissionsEnum::PERMISSION_CREATE->value,
            PermissionsEnum::PERMISSION_UPDATE->value,
            PermissionsEnum::USER_VIEW->value,
            PermissionsEnum::USER_CREATE->value,
            PermissionsEnum::USER_UPDATE->value,
        );
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User $user
     * @param Role $role
     *
     * @return bool
     */
    public function view(User $user, Role $role): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($role->name === RolesEnum::ADMIN->value) {
            return false;
        }

        return $user->hasAnyPermission(
            PermissionsEnum::ROLE_VIEW->value,
            PermissionsEnum::ROLE_CREATE->value,
            PermissionsEnum::ROLE_UPDATE->value,
            PermissionsEnum::ROLE_DELETE->value,
            PermissionsEnum::PERMISSION_VIEW->value,
            PermissionsEnum::PERMISSION_CREATE->value,
            PermissionsEnum::PERMISSION_UPDATE->value,
            PermissionsEnum::USER_VIEW->value,
            PermissionsEnum::USER_CREATE->value,
            PermissionsEnum::USER_UPDATE->value,
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

        return $user->hasPermissionTo(PermissionsEnum::ROLE_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User $user
     * @param Role $role
     *
     * @return bool
     */
    public function update(User $user, Role $role): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($role->name === RolesEnum::ADMIN->value) {
            return false;
        }

        return $user->hasPermissionTo(PermissionsEnum::ROLE_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User $user
     * @param Role $role
     *
     * @return bool
     */
    public function delete(User $user, Role $role): bool
    {
        if ($role->name === RolesEnum::ADMIN->value || $role->inUse()) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::ROLE_DELETE->value);
    }
}
