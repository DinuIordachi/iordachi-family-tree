<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Garage;
use App\Models\Association;
use App\Enums\RolesEnum;
use App\Enums\GarageStatusEnum;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class GarageApiTest extends TestCase
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

    public function test_can_list_garages(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();
        Garage::factory()->count(3)->create(['association_id' => $association->id]);

        $response = $this->getJson('/api/v1/garages');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'status'],
                ],
            ]);
    }

    public function test_can_show_garage(): void
    {
        Sanctum::actingAs($this->admin);

        $garage = Garage::factory()->create();

        $response = $this->getJson("/api/v1/garages/{$garage->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'status',
                    'city',
                    'street',
                    'cadastralNumber',
                    'area',
                ],
            ]);
    }

    public function test_can_create_garage(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();

        $payload = [
            'associationId'   => $association->id,
            'name'            => 'Garaj Nr. 42',
            'status'          => GarageStatusEnum::NORMAL->value,
            'city'            => 'Chisinau',
            'street'          => 'Stefan cel Mare',
            'internalAddress' => 'B',
            'addressNumber'   => '10',
            'cadastralNumber' => '0100000.001.0001',
            'area'            => 25.50,
        ];

        $response = $this->postJson('/api/v1/garages', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('garages', [
            'name'             => 'Garaj Nr. 42',
            'association_id'   => $association->id,
            'cadastral_number' => '0100000.001.0001',
        ]);
    }

    public function test_can_update_garage(): void
    {
        Sanctum::actingAs($this->admin);

        $garage = Garage::factory()->create();

        $payload = [
            'associationId'   => $garage->association_id,
            'name'            => 'Updated Garage Name',
            'status'          => GarageStatusEnum::NORMAL->value,
            'city'            => $garage->city,
            'street'          => $garage->street,
            'cadastralNumber' => $garage->cadastral_number,
            'area'            => $garage->area,
        ];

        $response = $this->putJson("/api/v1/garages/{$garage->id}", $payload);

        $response->assertStatus(200);

        $this->assertDatabaseHas('garages', [
            'id'   => $garage->id,
            'name' => 'Updated Garage Name',
        ]);
    }

    public function test_can_delete_garage(): void
    {
        Sanctum::actingAs($this->admin);

        $garage = Garage::factory()->create();

        $response = $this->deleteJson("/api/v1/garages/{$garage->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('garages', [
            'id' => $garage->id,
        ]);
    }

    public function test_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/v1/garages');

        $response->assertStatus(401);
    }

    public function test_store_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/garages', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'associationId',
                'name',
                'status',
                'city',
                'street',
                'cadastralNumber',
                'area',
            ]);
    }
}
