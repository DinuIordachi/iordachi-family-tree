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
            'first_name' => 'Dima',
            'email' => 'dimaiordachi3@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('!Q2w3e4r5'),
            'remember_token' => Str::random(10),
        ]);
        $admin->syncRoles(RolesEnum::ADMIN->value);

        $member = User::create([
            'first_name' => 'Ion',
            'email' => 'ioniordachi@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('B9;Umn7I1.f£'),
            'remember_token' => Str::random(10),
        ]);
        $member->syncRoles(RolesEnum::MEMBER->value);
    }
}
