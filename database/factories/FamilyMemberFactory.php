<?php

namespace Database\Factories;

use App\Models\FamilyMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\FamilyMember>
 */
class FamilyMemberFactory extends Factory
{
    protected $model = FamilyMember::class;

    public function definition(): array
    {
        $gender = fake()->randomElement(['M', 'F']);

        return [
            'first_name' => $gender === 'M' ? fake()->firstNameMale() : fake()->firstNameFemale(),
            'last_name' => fake()->lastName(),
            'birthdate' => fake()->dateTimeBetween('-90 years', '-1 year')->format('Y-m-d'),
            'gender' => $gender,
            'biography' => fake()->optional()->paragraph(),
        ];
    }
}
