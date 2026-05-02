<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Association;
use App\Models\Person;
use App\Models\DomainRole;
use App\Models\AssociationPersonRole;
use App\Enums\RolesEnum;
use App\Enums\DomainRoleScopeEnum;
use Database\Seeders\RoleSeeder;
use Database\Seeders\DomainRoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class AssociationPersonRoleApiTest extends TestCase
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

        $association = Association::factory()->create();
        $person = Person::factory()->create();
        $domainRole = DomainRole::where('scope', DomainRoleScopeEnum::ASSOCIATION->value)->first();

        $payload = [
            'roleId'    => $domainRole->id,
            'personId'  => $person->id,
            'startDate' => '2024-01-01',
            'isActive'  => true,
        ];

        $response = $this->postJson(
            "/api/v1/associations/{$association->id}/person-roles",
            $payload
        );

        $response->assertStatus(201);

        $this->assertDatabaseHas('association_person_roles', [
            'association_id' => $association->id,
            'role_id'        => $domainRole->id,
            'person_id'      => $person->id,
        ]);
    }

    public function test_can_update_person_role(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();
        $person = Person::factory()->create();
        $domainRole = DomainRole::where('scope', DomainRoleScopeEnum::ASSOCIATION->value)->first();

        $assignmentRole = AssociationPersonRole::create([
            'association_id' => $association->id,
            'role_id'        => $domainRole->id,
            'person_id'      => $person->id,
            'start_date'     => '2024-01-01',
            'is_active'      => true,
        ]);

        $payload = [
            'endDate'  => '2025-12-31',
            'isActive' => false,
        ];

        $response = $this->putJson(
            "/api/v1/associations/{$association->id}/person-roles/{$assignmentRole->id}",
            $payload
        );

        $response->assertStatus(200);

        $this->assertDatabaseHas('association_person_roles', [
            'id'        => $assignmentRole->id,
            'is_active' => false,
        ]);
    }

    public function test_can_remove_person_role(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();
        $person = Person::factory()->create();
        $domainRole = DomainRole::where('scope', DomainRoleScopeEnum::ASSOCIATION->value)->first();

        $assignmentRole = AssociationPersonRole::create([
            'association_id' => $association->id,
            'role_id'        => $domainRole->id,
            'person_id'      => $person->id,
            'start_date'     => '2024-01-01',
            'is_active'      => true,
        ]);

        $response = $this->deleteJson(
            "/api/v1/associations/{$association->id}/person-roles/{$assignmentRole->id}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('association_person_roles', [
            'id' => $assignmentRole->id,
        ]);
    }

    public function test_assign_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $association = Association::factory()->create();

        $response = $this->postJson(
            "/api/v1/associations/{$association->id}/person-roles",
            []
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roleId', 'personId', 'startDate']);
    }
}
