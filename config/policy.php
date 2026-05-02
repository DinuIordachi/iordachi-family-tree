<?php

use App\Models\User;
use App\Enums\RolesEnum;

return [
    'abbreviations' => [
        'va' => 'viewAny',
        'vao' => 'viewAnyOwn',
        'v' => 'view',
        'c' => 'create',
        'u' => 'update',
        'd' => 'delete',
        'fd' => 'force-delete',
    ],
    'roles' => [
        RolesEnum::ADMIN->value => [
            'display_name' => 'Administrator',
        ],
        RolesEnum::PUBLISHER->value => [
            'display_name' => 'Editor',
        ],
        RolesEnum::MEMBER->value => [
            'display_name' => 'Membru',
        ],
    ],
    'permissions' => [
        'dashboard' => ['v'],
        'account' => ['v', 'u', 'd'],
        'users' => ['va', 'v', 'c', 'u', 'd', 'fd', 'invite'],
        'roles' => ['va', 'v', 'c', 'u', 'd'],
        'permissions' => ['va', 'v', 'c', 'u', 'd'],
        'activities' => ['va', 'v', 'c', 'u', 'd'],
        'personal-access-tokens' => ['va', 'v', 'u', 'd', 'fd'],
        'settings' => ['va', 'v', 'u'],
        'garages' => ['va', 'v', 'c', 'u', 'd'],
        'associations' => ['va', 'v', 'c', 'u', 'd'],
        'persons' => ['va', 'v', 'c', 'u', 'd'],
        'contacts' => ['c', 'u', 'd'],
        'domain-roles' => ['va', 'v'],
    ],
    'permission_role' => [
        User::GUARD_NAME => [
            RolesEnum::ADMIN->value => [
                'dashboard' => ['v'],
                'account' => ['v', 'u', 'd'],
                'personal-access-tokens' => ['va', 'v', 'u', 'd', 'fd'],
                'activities' => ['va', 'v', 'd'],
                'users' => ['va', 'v', 'c', 'u', 'd', 'fd', 'invite'],
                'roles' => ['va', 'v', 'c', 'u', 'd'],
                'permissions' => ['va', 'v', 'c', 'u', 'd'],
                'settings' => ['va', 'v', 'u'],
                'garages' => ['va', 'v', 'c', 'u', 'd'],
                'associations' => ['va', 'v', 'c', 'u', 'd'],
                'persons' => ['va', 'v', 'c', 'u', 'd'],
                'contacts' => ['c', 'u', 'd'],
                'domain-roles' => ['va', 'v'],
            ],
            RolesEnum::PUBLISHER->value => [
                'dashboard' => ['v'],
                'account' => ['v', 'u', 'd'],
                'garages' => ['va', 'v', 'c', 'u'],
                'associations' => ['va', 'v'],
                'persons' => ['va', 'v', 'c', 'u'],
                'contacts' => ['c', 'u', 'd'],
                'domain-roles' => ['va', 'v'],
            ],
            RolesEnum::MEMBER->value => [
                'dashboard' => ['v'],
                'account' => ['v', 'u', 'd'],
                'garages' => ['va', 'v'],
                'associations' => ['va', 'v'],
                'persons' => ['va', 'v'],
                'domain-roles' => ['va', 'v'],
            ],
        ],
    ],
];
