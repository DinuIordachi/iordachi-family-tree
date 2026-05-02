<?php

namespace Database\Seeders;

use App\Models\DomainRole;
use App\Enums\DomainRoleNameEnum;
use App\Enums\DomainRoleScopeEnum;
use Illuminate\Database\Seeder;

class DomainRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $garageRoles = [
            DomainRoleNameEnum::OWNER,
            DomainRoleNameEnum::TENANT,
        ];

        $associationRoles = [
            DomainRoleNameEnum::MEMBER,
            DomainRoleNameEnum::LEADER,
            DomainRoleNameEnum::DIRECTOR,
            DomainRoleNameEnum::PRESIDENT,
            DomainRoleNameEnum::ADVISOR,
            DomainRoleNameEnum::ENTHUSIAST,
            DomainRoleNameEnum::ACCOUNTANT,
            DomainRoleNameEnum::AUDITOR,
            DomainRoleNameEnum::AUDIT_COMMITTEE_PRESIDENT,
            DomainRoleNameEnum::SECRETARY,
            DomainRoleNameEnum::MEETING_SECRETARY,
        ];

        foreach ($garageRoles as $role) {
            DomainRole::firstOrCreate([
                'name'  => $role->value,
                'scope' => DomainRoleScopeEnum::GARAGE->value,
            ]);
        }

        foreach ($associationRoles as $role) {
            DomainRole::firstOrCreate([
                'name'  => $role->value,
                'scope' => DomainRoleScopeEnum::ASSOCIATION->value,
            ]);
        }
    }
}
