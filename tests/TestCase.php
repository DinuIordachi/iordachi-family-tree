<?php

namespace Tests;

use App\Models\User;
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
}
