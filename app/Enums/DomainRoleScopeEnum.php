<?php

namespace App\Enums;

use App\Traits\EnumToArray;

enum DomainRoleScopeEnum: string
{
    use EnumToArray;

    case GARAGE = 'garage';
    case ASSOCIATION = 'association';
}
