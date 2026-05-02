<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Association;
use App\Enums\RolesEnum;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class AssociationApiTest extends TestCase
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

    public function test_can_list_associations(): void
    {
        Sanctum::actingAs($this->admin);

        Association::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/associations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'address'],
                ],
            ]);
    }

    public function test_can_show_association(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();

        $response = $this->getJson("/api/v1/associations/{$association->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'address',
                ],
            ]);
    }

    public function test_can_create_association(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name'              => 'Test Association',
            'address'           => '123 Main Street',
            'phone'             => '+37360123456',
            'cadastralNumbers'  => ['0100000.001', '0100000.002'],
        ];

        $response = $this->postJson('/api/v1/associations', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('associations', [
            'name'    => 'Test Association',
            'address' => '123 Main Street',
        ]);
    }

    public function test_can_update_association(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();

        $payload = [
            'name'    => 'Updated Association Name',
            'address' => $association->address,
        ];

        $response = $this->putJson("/api/v1/associations/{$association->id}", $payload);

        $response->assertStatus(200);

        $this->assertDatabaseHas('associations', [
            'id'   => $association->id,
            'name' => 'Updated Association Name',
        ]);
    }

    public function test_can_delete_association(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();

        $response = $this->deleteJson("/api/v1/associations/{$association->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('associations', [
            'id' => $association->id,
        ]);
    }

    public function test_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/v1/associations');

        $response->assertStatus(401);
    }

    public function test_store_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/associations', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'address']);
    }
}
