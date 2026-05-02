<?php

namespace App\Policies;

use App\Models\User;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;
use App\Models\Activity;

class ActivityPolicy
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

        return $user->hasPermissionTo(PermissionsEnum::ACTIVITY_VIEW_ANY->value);
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User     $user
     * @param Activity $activity
     *
     * @return bool
     */
    public function view(User $user, Activity $activity): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::ACTIVITY_VIEW->value);
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
        return false;
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param User     $user
     * @param Activity $activity
     *
     * @return bool
     */
    public function update(User $user, Activity $activity): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User     $user
     * @param Activity $activity
     *
     * @return bool
     */
    public function delete(User $user, Activity $activity): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::ACTIVITY_DELETE->value);
    }
}
