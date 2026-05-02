<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Support\Str;
use App\Services\PhoneService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Contracts\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $phoneService = new PhoneService;
        $phoneNumber = fake()->e164PhoneNumber();

        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'phone' => $phoneService->formatInternational($phoneNumber),
            'email' => $this->generateUniqueEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }


    /**
     * Assign roles to all users made with the factory
     *
     * @param array|string|int|\Spatie\Permission\Contracts\Role|\Illuminate\Support\Collection ...$roles
     *
     * @return static
     */
    public function withRoles(array|string|int|Role|Collection  ...$roles): static
    {
        return $this->afterCreating(function (User $user) use ($roles) {
            $user->syncRoles(...$roles);
        });
    }

    /**
     * Generate a unique email
     *
     * @return string
     */
    public function generateUniqueEmail(): string
    {
        do {
            $email = fake()->unique()->safeEmail();
        } while (User::query()->where('email', $email)->exists());

        return $email;
    }
}
