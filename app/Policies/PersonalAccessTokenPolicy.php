<?php

namespace App\Policies;

use App\Models\User;
use App\Enums\RolesEnum;
use App\Models\PersonalAccessToken;
use App\Enums\PermissionsEnum;

class PersonalAccessTokenPolicy
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

        return $user->hasPermissionTo(PermissionsEnum::PERSONAL_ACCESS_TOKEN_VIEW_ANY->value);
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param User                $user
     * @param PersonalAccessToken $personalAccessToken
     *
     * @return bool
     */
    public function view(User $user, PersonalAccessToken $personalAccessToken): bool
    {
        if (! is_null($personalAccessToken->deleted_at)) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERSONAL_ACCESS_TOKEN_VIEW->value);
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
     * @param User                $user
     * @param PersonalAccessToken $personalAccessToken
     *
     * @return bool
     */
    public function update(User $user, PersonalAccessToken $personalAccessToken): bool
    {
        if (! is_null($personalAccessToken->deleted_at)) {
            return false;
        }

        if ($personalAccessToken->isExpired()) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERSONAL_ACCESS_TOKEN_UPDATE->value);
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param User                $user
     * @param PersonalAccessToken $personalAccessToken
     *
     * @return bool
     */
    public function delete(User $user, PersonalAccessToken $personalAccessToken): bool
    {
        if (! is_null($personalAccessToken->deleted_at)) {
            return false;
        }

        if ($personalAccessToken->isExpired() && $personalAccessToken->tokenable->is($user)) {
            return true;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERSONAL_ACCESS_TOKEN_DELETE->value);
    }

    /**
     * Determine whether the user can force delete the model.
     *
     * @param User                $user
     * @param PersonalAccessToken $personalAccessToken
     *
     * @return bool
     */
    public function forceDelete(User $user, PersonalAccessToken $personalAccessToken): bool
    {
        if ($personalAccessToken->isExpired() && $personalAccessToken->tokenable->is($user)) {
            return true;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasPermissionTo(PermissionsEnum::PERSONAL_ACCESS_TOKEN_FORCE_DELETE->value);
    }
}
