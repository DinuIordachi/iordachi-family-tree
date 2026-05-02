<?php

use App\Models\User;
use App\Enums\RolesEnum;

return [
    'abbreviations' => [
        'va' => 'viewAny',
        'v' => 'view',
        'c' => 'create',
        'u' => 'update',
        'd' => 'delete',
        'fd' => 'force-delete',
    ],
    'roles' => [
        RolesEnum::ADMIN->value => ['display_name' => 'Administrator'],
        RolesEnum::PUBLISHER->value => ['display_name' => 'Publisher'],
        RolesEnum::MEMBER->value => ['display_name' => 'Member'],
    ],
    'permissions' => [
        'dashboard' => ['v'],
        'account' => ['v', 'u', 'd'],
        'users' => ['va', 'v', 'c', 'u', 'd', 'fd', 'invite'],
        'roles' => ['va', 'v', 'c', 'u', 'd'],
        'permissions' => ['va', 'v', 'c', 'u', 'd'],
        'activities' => ['va', 'v', 'd'],
        'personal-access-tokens' => ['va', 'v', 'u', 'd', 'fd'],
    ],
    'permission_role' => [
        User::GUARD_NAME => [
            RolesEnum::ADMIN->value => [
                'dashboard' => ['v'],
                'account' => ['v', 'u', 'd'],
                'users' => ['va', 'v', 'c', 'u', 'd', 'fd', 'invite'],
                'roles' => ['va', 'v', 'c', 'u', 'd'],
                'permissions' => ['va', 'v', 'c', 'u', 'd'],
                'activities' => ['va', 'v', 'd'],
                'personal-access-tokens' => ['va', 'v', 'u', 'd', 'fd'],
            ],
            RolesEnum::PUBLISHER->value => [
                'dashboard' => ['v'],
                'account' => ['v', 'u', 'd'],
                'users' => ['va', 'v'],
                'personal-access-tokens' => ['va', 'v', 'u', 'd'],
            ],
            RolesEnum::MEMBER->value => [
                'dashboard' => ['v'],
                'account' => ['v', 'u', 'd'],
                'personal-access-tokens' => ['v', 'u', 'd'],
            ],
        ],
    ],
];
