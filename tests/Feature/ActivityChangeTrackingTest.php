<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Activity;
use App\Models\FamilyMember;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityChangeTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_a_member_logs_only_changed_fields(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create(['first_name' => 'Ion', 'last_name' => 'Iordachi']);
        Activity::query()->delete();

        $this->withToken($token)
            ->putJson("/api/v1/family-tree/{$member->id}", ['firstName' => 'Ioan', 'lastName' => 'Iordachi'])
            ->assertOk();

        $activities = Activity::where('event', 'updated')->get();
        $this->assertCount(1, $activities);
        $this->assertSame(['first_name' => 'Ion'], $activities[0]->properties['old']);
        $this->assertSame(['first_name' => 'Ioan'], $activities[0]->properties['attributes']);
        $this->assertSame('family-member', $activities[0]->log_name);
        $this->assertNotNull($activities[0]->causer_id);
    }

    public function test_saving_without_changes_logs_nothing(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create(['first_name' => 'Ion', 'last_name' => 'Iordachi']);
        Activity::query()->delete();

        $this->withToken($token)
            ->putJson("/api/v1/family-tree/{$member->id}", ['firstName' => 'Ion', 'lastName' => 'Iordachi'])
            ->assertOk();

        $this->assertSame(0, Activity::count());
    }

    public function test_creating_a_member_logs_once(): void
    {
        $token = $this->adminToken();
        Activity::query()->delete();

        $id = $this->withToken($token)
            ->postJson('/api/v1/family-tree', ['firstName' => 'Maria'])
            ->assertCreated()
            ->json('data.id');

        $activities = Activity::where('subject_type', FamilyMember::class)->where('subject_id', $id)->get();
        $this->assertCount(1, $activities);
        $this->assertSame('created', $activities[0]->event);
    }

    public function test_deleting_a_member_logs_once(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create();
        Activity::query()->delete();

        $this->withToken($token)->deleteJson("/api/v1/family-tree/{$member->id}")->assertOk();

        $this->assertSame(['deleted'], Activity::pluck('event')->all());
    }

    public function test_user_password_is_never_logged(): void
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $user = User::factory()->create();
        Activity::query()->delete();

        $user->update(['first_name' => 'Changed', 'password' => 'Secret-123456', 'email_code' => '123456']);

        $this->assertSame(1, Activity::count());
        $json = json_encode(Activity::first()->properties);
        $this->assertStringContainsString('Changed', $json);
        $this->assertStringNotContainsString('password', $json);
        $this->assertStringNotContainsString('email_code', $json);
        $this->assertStringNotContainsString('123456', $json);
    }

    public function test_relationship_change_logs_one_entry(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create();
        $parent = FamilyMember::factory()->create();
        Activity::query()->delete();

        $this->withToken($token)
            ->putJson("/api/v1/family-tree/{$member->id}", ['parentIds' => [$parent->id]])
            ->assertOk();

        $rows = Activity::where('event', 'relationships-updated')->get();
        $this->assertCount(1, $rows);
        $this->assertSame($parent->id, $rows[0]->properties['attributes']['parents'][0]['id']);
        $this->assertSame([], $rows[0]->properties['old']['parents']);

        $this->withToken($token)
            ->putJson("/api/v1/family-tree/{$member->id}", ['parentIds' => [$parent->id]])
            ->assertOk();

        $this->assertSame(1, Activity::where('event', 'relationships-updated')->count());
    }
}
