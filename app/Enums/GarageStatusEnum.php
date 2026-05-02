<?php

namespace App\Enums;

use App\Traits\EnumToArray;

enum GarageStatusEnum: string
{
    use EnumToArray;

    case NORMAL = 'normal';
    case SEIZED_BY_STATE = 'seized_by_state';
    case UNDER_STATE_INVESTIGATION = 'under_state_investigation';
}
