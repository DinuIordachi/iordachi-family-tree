<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Activity;
use App\Models\FamilyMember;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_changes_are_normalised(): void
    {
        $token = $this->adminToken($admin);
        $member = FamilyMember::factory()->create(['first_name' => 'Ion', 'last_name' => 'Iordachi']);
        Activity::query()->delete();
        $this->withToken($token)->putJson("/api/v1/family-tree/{$member->id}", ['firstName' => 'Ioan'])->assertOk();

        $row = $this->withToken($token)->getJson('/api/v1/activities')->assertOk()->json('data.0');

        $this->assertSame([['field' => 'first_name', 'old' => 'Ion', 'new' => 'Ioan']], $row['changes']);
        $this->assertSame('family-member', $row['subjectType']);
        $this->assertSame($member->id, $row['subjectId']);
        $this->assertSame('Ioan Iordachi', $row['subjectLabel']);
        $this->assertSame($admin->id, $row['causer']['id']);
        $this->assertSame($admin->email, $row['causer']['email']);
    }

    public function test_relationship_changes_flatten_to_names(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create();
        $parent = FamilyMember::factory()->create(['first_name' => 'Vasile', 'last_name' => 'Iordachi']);
        Activity::query()->delete();
        $this->withToken($token)->putJson("/api/v1/family-tree/{$member->id}", ['parentIds' => [$parent->id]])->assertOk();

        $row = $this->withToken($token)->getJson('/api/v1/activities?event=relationships-updated')->json('data.0');

        $this->assertSame([['field' => 'parents', 'old' => '', 'new' => 'Vasile Iordachi']], $row['changes']);
    }

    public function test_deleted_subject_label(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create();
        $id = $member->id;
        $member->forceDelete();

        $row = $this->withToken($token)->getJson('/api/v1/activities?subjectType=family-member&event=created')->json('data.0');

        $this->assertSame("#{$id} (deleted)", $row['subjectLabel']);
    }

    public function test_null_causer_renders(): void
    {
        $token = $this->adminToken();
        Activity::query()->delete();
        activity()->log('system thing');

        $row = $this->withToken($token)->getJson('/api/v1/activities')->assertOk()->json('data.0');

        $this->assertNull($row['causer']);
        $this->assertSame([], $row['changes']);
        $this->assertSame('', $row['subjectLabel']);
    }

    public function test_filters_endpoint_lists_distinct_values(): void
    {
        $token = $this->adminToken($admin);
        activity()->causedBy($admin)->event('login')->log('in');
        activity()->causedBy($admin)->event('login')->log('in again');

        $data = $this->withToken($token)->getJson('/api/v1/activities/filters')->assertOk()->json('data');

        $this->assertSame(1, collect($data['events'])->filter(fn ($e) => $e === 'login')->count());
        $this->assertContains('family-member', $data['subjectTypes']);
        $this->assertSame($admin->id, collect($data['causers'])->firstWhere('email', $admin->email)['id']);
        $this->assertArrayHasKey('logNames', $data);
    }

    public function test_filters_endpoint_is_admin_only(): void
    {
        $this->withToken($this->apiToken())->getJson('/api/v1/activities/filters')->assertForbidden();
    }
}
