<?php

namespace App\Policies;

use App\Models\User;
use App\Enums\PermissionsEnum;

class UserPolicy
{
    public function before(?User $user): bool|null
    {
        if (! $user) {
            return false;
        }

        if (! $user->hasVerifiedEmail() || $user->isBlocked()) {
            return false;
        }

        $hasPermissions = $user->hasAnyPermission(
            PermissionsEnum::DASHBOARD_VIEW->value,
            PermissionsEnum::ACCOUNT_VIEW->value,
        );

        return $hasPermissions ? null : false;
    }

    public function viewAny(User $user): bool
    {
        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::USER_VIEW_ANY->value);
    }

    public function view(User $user, User $target): bool
    {
        return $user->isAdmin()
            || $user->is($target)
            || $user->hasPermissionTo(PermissionsEnum::USER_VIEW->value);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::USER_CREATE->value);
    }

    public function update(User $user, User $target): bool
    {
        return $user->isAdmin()
            || $user->is($target)
            || $user->hasPermissionTo(PermissionsEnum::USER_UPDATE->value);
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->is($target)) {
            return false;
        }

        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::USER_DELETE->value);
    }

    public function forceDelete(User $user, User $target): bool
    {
        if ($user->is($target)) {
            return false;
        }

        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::USER_FORCE_DELETE->value);
    }

    public function invite(User $user): bool
    {
        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::USER_INVITE->value);
    }
}
