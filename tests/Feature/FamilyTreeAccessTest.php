<?php

namespace Tests\Feature;

use App\Models\FamilyMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyTreeAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_read_the_family_tree(): void
    {
        $member = FamilyMember::factory()->create();

        $this->getJson('/api/v1/family-tree')->assertUnauthorized();
        $this->getJson("/api/v1/family-tree/{$member->id}")->assertUnauthorized();
    }

    public function test_verified_users_can_read_the_family_tree(): void
    {
        $member = FamilyMember::factory()->create();
        $token = $this->apiToken();

        $this->withToken($token)->getJson('/api/v1/family-tree')->assertOk();
        $this->withToken($token)->getJson("/api/v1/family-tree/{$member->id}")->assertOk();
    }

    public function test_unverified_users_cannot_read_the_family_tree(): void
    {
        $token = $this->apiToken(verified: false);

        $this->withToken($token)->getJson('/api/v1/family-tree')->assertForbidden();
    }

    public function test_registration_is_closed(): void
    {
        $this->postJson('/api/v1/register', [
            'first_name' => 'Guest',
            'email' => 'guest@example.com',
            'password' => 'Secret-123456',
            'password_confirmation' => 'Secret-123456',
        ])->assertNotFound();

        $this->assertDatabaseMissing('users', ['email' => 'guest@example.com']);
    }
}
