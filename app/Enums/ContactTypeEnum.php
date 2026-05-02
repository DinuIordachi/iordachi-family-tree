<?php

namespace App\Enums;

use App\Traits\EnumToArray;

enum ContactTypeEnum: string
{
    use EnumToArray;

    case EMAIL = 'email';
    case PHONE = 'phone';
}
