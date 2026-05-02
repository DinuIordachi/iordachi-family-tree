<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Person;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Contact>
 */
class ContactFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\Illuminate\Database\Eloquent\Model>
     */
    protected $model = Contact::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['email', 'phone']);

        return [
            'person_id' => Person::factory(),
            'type'      => $type,
            'value'     => $type === 'email' ? fake()->email() : fake()->phoneNumber(),
            'favorite'  => fake()->boolean(20),
            'whatsapp'  => fake()->boolean(30),
            'viber'     => fake()->boolean(30),
            'telegram'  => fake()->boolean(30),
            'calls'     => fake()->boolean(30),
            'sms'       => fake()->boolean(30),
        ];
    }
}
