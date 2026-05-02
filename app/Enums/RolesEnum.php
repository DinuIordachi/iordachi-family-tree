<?php

namespace App\Enums;

use App\Traits\EnumToArray;

enum RolesEnum: string
{
    use EnumToArray;

    case ADMIN = 'admin';
    case PUBLISHER = 'publisher';
    case MEMBER = 'member';
}
