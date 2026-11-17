<?php

namespace Tests;

use App\Models\User;
use App\Enums\RolesEnum;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * A Sanctum token for a fresh user. Roles and permissions are seeded first:
     * new users get the `member` role and the policies check permissions.
     */
    protected function apiToken(bool $verified = true): string
    {
        $this->seed(RoleSeeder::class);

        $factory = $verified ? User::factory() : User::factory()->unverified();

        return $factory->create()->createToken('test')->plainTextToken;
    }

    /**
     * A Sanctum token for a fresh verified admin.
     */
    protected function adminToken(?User &$admin = null): string
    {
        $this->seed(RoleSeeder::class);

        $admin = User::factory()->create();
        $admin->syncRoles([RolesEnum::ADMIN->value]);

        return $admin->createToken('test')->plainTextToken;
    }
}
