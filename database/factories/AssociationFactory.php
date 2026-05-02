<?php

namespace Database\Factories;

use App\Models\Association;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Association>
 */
class AssociationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\Illuminate\Database\Eloquent\Model>
     */
    protected $model = Association::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $count = fake()->numberBetween(2, 3);
        $cadastralNumbers = [];

        for ($i = 1; $i <= $count; $i++) {
            $cadastralNumbers[] = sprintf(
                '%07d.%03d',
                fake()->numberBetween(1000000, 9999999),
                $i,
            );
        }

        return [
            'name'              => 'Asociația Proprietarilor de Garaje Nr. ' . fake()->numberBetween(1, 100),
            'address'           => fake()->address(),
            'phone'             => fake()->phoneNumber(),
            'cadastral_numbers' => $cadastralNumbers,
        ];
    }
}
