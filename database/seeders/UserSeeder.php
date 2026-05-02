<?php

namespace Database\Seeders;

use App\Models\User;
use App\Enums\RolesEnum;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'first_name' => 'Admin',
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $admin->syncRoles(RolesEnum::ADMIN->value);

        $publisher = User::create([
            'first_name' => 'Publisher',
            'email' => 'publisher@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $publisher->syncRoles(RolesEnum::PUBLISHER->value);

        $member = User::create([
            'first_name' => 'Member',
            'email' => 'member@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $member->syncRoles(RolesEnum::MEMBER->value);
    }
}
