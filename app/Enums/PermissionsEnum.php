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
    case VIEW_ANY_OWN = 'viewAnyOwn';
    case VIEW = 'view';
    case CREATE = 'create';
    case UPDATE = 'update';
    case DELETE = 'delete';
    case FORCE_DELETE = 'force-delete';
    case INVITE = 'invite';

    /**
     * Dashboard permissions
     */
    case DASHBOARD_VIEW = 'view-dashboard';

    /**
     * Account permissions
     */
    case ACCOUNT_VIEW = 'view-account';
    case ACCOUNT_UPDATE = 'update-account';
    case ACCOUNT_DELETE = 'delete-account';

    /**
     * User permissions
     */
    case USER_VIEW_ANY = 'viewAny-users';
    case USER_VIEW = 'view-users';
    case USER_CREATE = 'create-users';
    case USER_UPDATE = 'update-users';
    case USER_DELETE = 'delete-users';
    case USER_INVITE = 'invite-users';
    case USER_FORCE_DELETE = 'force-delete-users';

    /**
     * Role permissions
     */
    case ROLE_VIEW_ANY = 'viewAny-roles';
    case ROLE_VIEW = 'view-roles';
    case ROLE_CREATE = 'create-roles';
    case ROLE_UPDATE = 'update-roles';
    case ROLE_DELETE = 'delete-roles';

    /**
     * Permission permissions
     */
    case PERMISSION_VIEW_ANY = 'viewAny-permissions';
    case PERMISSION_VIEW = 'view-permissions';
    case PERMISSION_CREATE = 'create-permissions';
    case PERMISSION_UPDATE = 'update-permissions';
    case PERMISSION_DELETE = 'delete-permissions';

    /**
     * Activity permissions
     */
    case ACTIVITY_VIEW_ANY = 'viewAny-activities';
    case ACTIVITY_VIEW = 'view-activities';
    case ACTIVITY_DELETE = 'delete-activities';

    /**
     * Personal access token permissions
     */
    case PERSONAL_ACCESS_TOKEN_VIEW_ANY = 'viewAny-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_VIEW = 'view-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_UPDATE = 'update-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_DELETE = 'delete-personal-access-tokens';
    case PERSONAL_ACCESS_TOKEN_FORCE_DELETE = 'force-delete-personal-access-tokens';

    /**
     * Settings permissions
     */
    case SETTINGS_VIEW_ANY = 'viewAny-settings';
    case SETTINGS_VIEW = 'view-settings';
    case SETTINGS_UPDATE = 'update-settings';

    /**
     * Garage permissions
     */
    case GARAGE_VIEW_ANY = 'viewAny-garages';
    case GARAGE_VIEW = 'view-garages';
    case GARAGE_CREATE = 'create-garages';
    case GARAGE_UPDATE = 'update-garages';
    case GARAGE_DELETE = 'delete-garages';

    /**
     * Association permissions
     */
    case ASSOCIATION_VIEW_ANY = 'viewAny-associations';
    case ASSOCIATION_VIEW = 'view-associations';
    case ASSOCIATION_CREATE = 'create-associations';
    case ASSOCIATION_UPDATE = 'update-associations';
    case ASSOCIATION_DELETE = 'delete-associations';

    /**
     * Person permissions
     */
    case PERSON_VIEW_ANY = 'viewAny-persons';
    case PERSON_VIEW = 'view-persons';
    case PERSON_CREATE = 'create-persons';
    case PERSON_UPDATE = 'update-persons';
    case PERSON_DELETE = 'delete-persons';

    /**
     * Contact permissions
     */
    case CONTACT_CREATE = 'create-contacts';
    case CONTACT_UPDATE = 'update-contacts';
    case CONTACT_DELETE = 'delete-contacts';

    /**
     * Domain Role permissions
     */
    case DOMAIN_ROLE_VIEW_ANY = 'viewAny-domain-roles';
    case DOMAIN_ROLE_VIEW = 'view-domain-roles';
}
