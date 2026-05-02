<?php

namespace App\Enums;

use App\Traits\EnumToArray;

enum DomainRoleNameEnum: string
{
    use EnumToArray;

    // Garage-scoped
    case OWNER = 'owner';
    case TENANT = 'tenant';

    // Association-scoped
    case MEMBER = 'member';
    case LEADER = 'leader';
    case DIRECTOR = 'director';
    case PRESIDENT = 'president';
    case ADVISOR = 'advisor';
    case ENTHUSIAST = 'enthusiast';
    case ACCOUNTANT = 'accountant';
    case AUDITOR = 'auditor';
    case AUDIT_COMMITTEE_PRESIDENT = 'audit_committee_president';
    case SECRETARY = 'secretary';
    case MEETING_SECRETARY = 'meeting_secretary';
}
