<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Activity;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityAccessTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role, array $permissions = []): string
    {
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create();
        $user->syncRoles([$role]);
        if ($permissions) {
            $user->givePermissionTo($permissions);
        }

        return $user->createToken('test')->plainTextToken;
    }

    public function test_admin_can_list_activities(): void
    {
        $token = $this->adminToken();
        activity()->log('something happened');

        $this->withToken($token)->getJson('/api/v1/activities')
            ->assertOk()
            ->assertJsonPath('meta.total', Activity::count());
    }

    public function test_member_with_activity_permission_is_forbidden(): void
    {
        $token = $this->tokenFor(RolesEnum::MEMBER->value, [
            PermissionsEnum::ACTIVITY_VIEW_ANY->value,
            PermissionsEnum::ACTIVITY_VIEW->value,
            PermissionsEnum::ACTIVITY_DELETE->value,
        ]);
        $activity = activity()->log('something happened');

        $this->withToken($token)->getJson('/api/v1/activities')->assertForbidden();
        $this->withToken($token)->getJson("/api/v1/activities/{$activity->id}")->assertForbidden();
        $this->withToken($token)->deleteJson("/api/v1/activities/{$activity->id}")->assertForbidden();
    }

    public function test_publisher_is_forbidden(): void
    {
        $token = $this->tokenFor(RolesEnum::PUBLISHER->value);

        $this->withToken($token)->getJson('/api/v1/activities')->assertForbidden();
    }
}
