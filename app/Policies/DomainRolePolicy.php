<?php

namespace App\Policies;

use App\Models\DomainRole;
use App\Models\User;
use App\Enums\PermissionsEnum;

class DomainRolePolicy
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
            PermissionsEnum::DOMAIN_ROLE_VIEW_ANY->value,
            PermissionsEnum::DOMAIN_ROLE_VIEW->value,
        );
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User       $user
     * @param DomainRole $domainRole
     *
     * @return bool
     */
    public function view(User $user, DomainRole $domainRole): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::DOMAIN_ROLE_VIEW->value);
    }
}
