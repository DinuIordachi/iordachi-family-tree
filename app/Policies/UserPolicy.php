<?php

namespace App\Policies;

use App\Models\User;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;

class UserPolicy
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

        $hasPermissions = $user->hasAnyPermission(
            PermissionsEnum::DASHBOARD_VIEW->value,
            PermissionsEnum::ACCOUNT_VIEW->value
        );

        if (! $hasPermissions) {
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

        return $user->hasPermissionTo(PermissionsEnum::USER_VIEW_ANY->value);
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function view(User $user, User $updatedUser): bool
    {
        if ($user->isAdmin() || $user->is($updatedUser)) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_VIEW->value);
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

        return $user->hasPermissionTo(PermissionsEnum::USER_CREATE->value);
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function update(User $user, User $updatedUser): bool
    {
        if ($user->isAdmin() || $user->is($updatedUser)) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function delete(User $user, User $updatedUser): bool
    {
        if ($user->is($updatedUser)) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_DELETE->value);
    }

    /**
     * Determine whether the user can force delete the model.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function forceDelete(User $user, User $updatedUser): bool
    {
        if ($user->isAdmin() && $user->is($updatedUser)) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_FORCE_DELETE->value);
    }

    /**
     * Determine whether the user can create models.
     *
     * @param User $user
     *
     * @return bool
     */
    public function invite(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_INVITE->value);
    }

    /**
     * Determine whether the user can create models.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function confirmPayment(User $user, User $updatedUser): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_CONFIRM_PAYMENT->value);
    }

    /**
     * Determine whether the user can approve membership for the model.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function approveMembership(User $user, User $updatedUser): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_APPROVE_MEMBERSHIP->value);
    }

    /**
     * Determine whether the user can reject membership for the model.
     *
     * @param User $user
     * @param User $updatedUser
     *
     * @return bool
     */
    public function rejectMembership(User $user, User $updatedUser): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::USER_REJECT_MEMBERSHIP->value);
    }
}
