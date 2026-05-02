<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Garage;
use App\Models\Person;
use App\Models\DomainRole;
use App\Models\GaragePersonRole;
use App\Enums\RolesEnum;
use App\Enums\DomainRoleNameEnum;
use App\Enums\DomainRoleScopeEnum;
use Database\Seeders\RoleSeeder;
use Database\Seeders\DomainRoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class GaragePersonRoleApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(DomainRoleSeeder::class);

        $this->admin = User::factory()
            ->withRoles(RolesEnum::ADMIN->value)
            ->create();
    }

    public function test_can_assign_person_role(): void
    {
        Sanctum::actingAs($this->admin);

        $garage = Garage::factory()->create();
        $person = Person::factory()->create();
        $domainRole = DomainRole::where('scope', DomainRoleScopeEnum::GARAGE->value)->first();

        $payload = [
            'roleId'              => $domainRole->id,
            'personId'            => $person->id,
            'ownershipPercentage' => 50.00,
        ];

        $response = $this->postJson("/api/v1/garages/{$garage->id}/person-roles", $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('garage_person_roles', [
            'garage_id' => $garage->id,
            'role_id'   => $domainRole->id,
            'person_id' => $person->id,
        ]);
    }

    public function test_can_remove_person_role(): void
    {
        Sanctum::actingAs($this->admin);

        $garage = Garage::factory()->create();
        $person = Person::factory()->create();
        $domainRole = DomainRole::where('scope', DomainRoleScopeEnum::GARAGE->value)->first();

        $garagePersonRole = GaragePersonRole::create([
            'garage_id' => $garage->id,
            'role_id'   => $domainRole->id,
            'person_id' => $person->id,
        ]);

        $response = $this->deleteJson(
            "/api/v1/garages/{$garage->id}/person-roles/{$garagePersonRole->id}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('garage_person_roles', [
            'id' => $garagePersonRole->id,
        ]);
    }

    public function test_assign_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $garage = Garage::factory()->create();

        $response = $this->postJson("/api/v1/garages/{$garage->id}/person-roles", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roleId', 'personId']);
    }
}
