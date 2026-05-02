<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Nnjeim\World\Actions\SeedAction as WorldSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(WorldSeeder::class);
        $this->call(RoleSeeder::class);
        $this->call(UserSeeder::class);
        $this->call(BankSettingsSeeder::class);
        $this->call(DomainRoleSeeder::class);
        $this->call(AssociationSeeder::class);
        $this->call(GarageSeeder::class);
        $this->call(PersonSeeder::class);
    }
}
