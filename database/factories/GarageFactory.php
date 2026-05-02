<?php

namespace Database\Factories;

use App\Models\Association;
use App\Models\Garage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Garage>
 */
class GarageFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\Illuminate\Database\Eloquent\Model>
     */
    protected $model = Garage::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(array_merge(
            array_fill(0, 90, 'normal'),
            array_fill(0, 5, 'seized_by_state'),
            array_fill(0, 5, 'under_state_investigation'),
        ));

        $cadastralNumber = sprintf(
            '%07d.%03d.%04d',
            fake()->numberBetween(1000000, 9999999),
            fake()->numberBetween(1, 999),
            fake()->numberBetween(1, 9999),
        );

        return [
            'association_id'   => Association::factory(),
            'name'             => 'Garaj Nr. ' . fake()->numberBetween(1, 500),
            'status'           => $status,
            'city'             => fake()->city(),
            'street'           => fake()->streetName(),
            'internal_address' => fake()->optional(0.3)->word(),
            'address_number'   => fake()->buildingNumber(),
            'cadastral_number' => $cadastralNumber,
            'area'             => fake()->randomFloat(2, 10, 60),
        ];
    }
}
