<?php

namespace App\Enums;

use App\Traits\EnumToArray;

enum PermissionsEnum: string
{
    use EnumToArray;

    /**
     * Action types
     */
    case VIEW_ANY = 'viewAny';
    case VIEW = 'view';
    case CREATE = 'create';
    case UPDATE = 'update';
    case DELETE = 'delete';
    case FORCE_DELETE = 'force-delete';
    case INVITE = 'invite';

    /**
     * Dashboard
     */
    case DASHBOARD_VIEW = 'view-dashboard';

    /**
     * Account
     */
    case ACCOUNT_VIEW = 'view-account';
    case ACCOUNT_UPDATE = 'update-account';
    case ACCOUNT_DELETE = 'delete-account';

    /**
     * Users
     */
    case USER_VIEW_ANY = 'viewAny-users';
    case USER_VIEW = 'view-users';
    case USER_CREATE = 'create-users';
    case USER_UPDATE = 'update-users';
    case USER_DELETE = 'delete-users';
    case USER_INVITE = 'invite-users';
    case USER_FORCE_DELETE = 'force-delete-users';

    /**
     * Roles
     */
    case ROLE_VIEW_ANY = 'viewAny-roles';
    case ROLE_VIEW = 'view-roles';
    case ROLE_CREATE = 'create-roles';
    case ROLE_UPDATE = 'update-roles';
    case ROLE_DELETE = 'delete-roles';

    /**
     * Permissions
     */
    case PERMISSION_VIEW_ANY = 'viewAny-permissions';
    case PERMISSION_VIEW = 'view-permissions';
    case PERMISSION_CREATE = 'create-permissions';
    case PERMISSION_UPDATE = 'update-permissions';
    case PERMISSION_DELETE = 'delete-permissions';

    /**
     * Activities
     */
    case ACTIVITY_VIEW_ANY = 'viewAny-activities';
    case ACTIVITY_VIEW = 'view-activities';
    case ACTIVITY_DELETE = 'delete-activities';

    /**
     * Personal access tokens
     */
    case PERSONAL_ACCESS_TOKEN_VIEW_ANY = 'viewAny-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_VIEW = 'view-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_UPDATE = 'update-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_DELETE = 'delete-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_FORCE_DELETE = 'force-delete-personal-access-tokens';

    /**
     * Family members
     */
    case FAMILY_MEMBER_VIEW_ANY = 'viewAny-family-members';
    case FAMILY_MEMBER_VIEW = 'view-family-members';
    case FAMILY_MEMBER_CREATE = 'create-family-members';
    case FAMILY_MEMBER_UPDATE = 'update-family-members';
    case FAMILY_MEMBER_DELETE = 'delete-family-members';
    case FAMILY_MEMBER_FORCE_DELETE = 'force-delete-family-members';
}
