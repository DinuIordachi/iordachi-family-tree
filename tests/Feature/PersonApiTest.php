<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Person;
use App\Enums\RolesEnum;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class PersonApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);

        $this->admin = User::factory()
            ->withRoles(RolesEnum::ADMIN->value)
            ->create();
    }

    public function test_can_list_persons(): void
    {
        Sanctum::actingAs($this->admin);

        Person::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/persons');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'firstName', 'lastName'],
                ],
            ]);
    }

    public function test_can_show_person(): void
    {
        Sanctum::actingAs($this->admin);

        $person = Person::factory()->create();

        $response = $this->getJson("/api/v1/persons/{$person->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'firstName',
                    'lastName',
                    'nameId',
                ],
            ]);
    }

    public function test_can_create_person(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'firstName'  => 'Ion',
            'lastName'   => 'Popescu',
            'patronymic' => 'Vasile',
        ];

        $response = $this->postJson('/api/v1/persons', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('persons', [
            'first_name' => 'Ion',
            'last_name'  => 'Popescu',
            'patronymic' => 'Vasile',
        ]);
    }

    public function test_name_id_auto_generated(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'firstName' => 'Ion',
            'lastName'  => 'Popescu',
        ];

        $response = $this->postJson('/api/v1/persons', $payload);

        $response->assertStatus(201);

        $person = Person::where('first_name', 'Ion')
            ->where('last_name', 'Popescu')
            ->first();

        $this->assertNotNull($person);
        $this->assertEquals('popescu-ion', $person->name_id);
    }

    public function test_duplicate_name_id_gets_suffix(): void
    {
        Sanctum::actingAs($this->admin);

        // Create first person
        $this->postJson('/api/v1/persons', [
            'firstName' => 'Ion',
            'lastName'  => 'Popescu',
        ]);

        // Create second person with same name
        $this->postJson('/api/v1/persons', [
            'firstName' => 'Ion',
            'lastName'  => 'Popescu',
        ]);

        $persons = Person::where('first_name', 'Ion')
            ->where('last_name', 'Popescu')
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $persons);
        $this->assertEquals('popescu-ion', $persons[0]->name_id);
        $this->assertEquals('popescu-ion-2', $persons[1]->name_id);
    }

    public function test_can_update_person(): void
    {
        Sanctum::actingAs($this->admin);

        $person = Person::factory()->create();

        $payload = [
            'firstName' => 'UpdatedFirst',
            'lastName'  => 'UpdatedLast',
        ];

        $response = $this->putJson("/api/v1/persons/{$person->id}", $payload);

        $response->assertStatus(200);

        $this->assertDatabaseHas('persons', [
            'id'         => $person->id,
            'first_name' => 'UpdatedFirst',
            'last_name'  => 'UpdatedLast',
        ]);
    }

    public function test_can_delete_person(): void
    {
        Sanctum::actingAs($this->admin);

        $person = Person::factory()->create();

        $response = $this->deleteJson("/api/v1/persons/{$person->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('persons', [
            'id' => $person->id,
        ]);
    }

    public function test_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/v1/persons');

        $response->assertStatus(401);
    }

    public function test_store_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/persons', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['firstName', 'lastName']);
    }
}
