<?php

namespace App\Policies;

use App\Models\User;
use App\Models\FamilyMember;
use App\Enums\PermissionsEnum;

class FamilyMemberPolicy
{
    /**
     * Reads of the family tree are public, so we DO NOT return false for null
     * users. Only writes go through `before()`'s default reject path.
     */
    public function before(?User $user, string $ability): bool|null
    {
        if (in_array($ability, ['viewAny', 'view'], true)) {
            return null;
        }

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

    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, FamilyMember $member): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::FAMILY_MEMBER_CREATE->value);
    }

    public function update(User $user, FamilyMember $member): bool
    {
        if ($member->trashed()) {
            return false;
        }

        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::FAMILY_MEMBER_UPDATE->value);
    }

    public function delete(User $user, FamilyMember $member): bool
    {
        if ($member->trashed()) {
            return false;
        }

        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::FAMILY_MEMBER_DELETE->value);
    }

    public function forceDelete(User $user, FamilyMember $member): bool
    {
        return $user->isAdmin()
            || $user->hasPermissionTo(PermissionsEnum::FAMILY_MEMBER_FORCE_DELETE->value);
    }
}
