<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Person;
use App\Models\Contact;
use App\Enums\RolesEnum;
use App\Enums\ContactTypeEnum;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class ContactApiTest extends TestCase
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

    public function test_can_create_contact(): void
    {
        Sanctum::actingAs($this->admin);

        $person = Person::factory()->create();

        $payload = [
            'type'    => ContactTypeEnum::EMAIL->value,
            'value'   => 'test@example.com',
            'favorite' => true,
        ];

        $response = $this->postJson("/api/v1/persons/{$person->id}/contacts", $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('contacts', [
            'person_id' => $person->id,
            'type'      => ContactTypeEnum::EMAIL->value,
            'value'     => 'test@example.com',
        ]);
    }

    public function test_can_update_contact(): void
    {
        Sanctum::actingAs($this->admin);

        $contact = Contact::factory()->create();

        $payload = [
            'type'  => ContactTypeEnum::PHONE->value,
            'value' => '+37360999888',
        ];

        $response = $this->putJson(
            "/api/v1/persons/{$contact->person_id}/contacts/{$contact->id}",
            $payload
        );

        $response->assertStatus(200);

        $this->assertDatabaseHas('contacts', [
            'id'    => $contact->id,
            'value' => '+37360999888',
        ]);
    }

    public function test_can_delete_contact(): void
    {
        Sanctum::actingAs($this->admin);

        $contact = Contact::factory()->create();

        $response = $this->deleteJson(
            "/api/v1/persons/{$contact->person_id}/contacts/{$contact->id}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('contacts', [
            'id' => $contact->id,
        ]);
    }

    public function test_contact_validates_type_enum(): void
    {
        Sanctum::actingAs($this->admin);

        $person = Person::factory()->create();

        $payload = [
            'type'  => 'invalid_type',
            'value' => 'test@example.com',
        ];

        $response = $this->postJson("/api/v1/persons/{$person->id}/contacts", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_unauthenticated_returns_401(): void
    {
        $person = Person::factory()->create();

        $response = $this->postJson("/api/v1/persons/{$person->id}/contacts", [
            'type'  => ContactTypeEnum::EMAIL->value,
            'value' => 'test@example.com',
        ]);

        $response->assertStatus(401);
    }
}
