<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Activity;
use App\Models\FamilyMember;
use Illuminate\Http\UploadedFile;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityReviewFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_force_deleting_a_member_logs_a_single_entry(): void
    {
        $token = $this->adminToken();
        $member = FamilyMember::factory()->create();
        $member->delete();
        Activity::query()->delete();

        $this->withToken($token)->deleteJson("/api/v1/family-tree/{$member->id}/force-delete")->assertOk();

        $this->assertSame(['force-delete-family-members'], Activity::pluck('event')->all());
    }

    public function test_force_deleting_a_user_logs_a_single_entry(): void
    {
        $token = $this->adminToken();
        $user = User::factory()->create();
        $user->delete();
        Activity::query()->delete();

        $this->withToken($token)->deleteJson("/api/v1/users/{$user->id}/force-delete")->assertOk();

        $this->assertSame(['force-delete-users'], Activity::pluck('event')->all());
    }

    public function test_people_without_a_last_name_are_found_by_name(): void
    {
        $token = $this->adminToken();
        $zamfira = User::factory()->create(['first_name' => 'Zamfira', 'last_name' => null]);
        Activity::query()->delete();
        activity()->causedBy($zamfira)->event('login')->log('logged in');

        $this->withToken($token)->getJson('/api/v1/activities?term=zamfira')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_password_reset_code_is_not_logged(): void
    {
        Notification::fake();
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create();
        $user->forceFill(['email_code' => '987654', 'email_code_expires_at' => now()->addHour()])->save();
        Activity::query()->delete();

        $this->postJson('/api/v1/reset-password', [
            'code' => '987654',
            'password' => 'New-Secret-123',
            'password_confirmation' => 'New-Secret-123',
        ])->assertOk();

        $this->assertGreaterThan(0, Activity::count());
        foreach (Activity::all() as $activity) {
            $this->assertStringNotContainsString('987654', $activity->description . json_encode($activity->properties));
        }
    }

    public function test_avatar_change_is_logged(): void
    {
        Storage::fake('public');
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        Activity::query()->delete();

        $this->withToken($token)
            ->post('/api/v1/me', ['firstName' => $user->first_name, 'lastName' => $user->last_name, 'email' => $user->email, 'avatarFile' => UploadedFile::fake()->image('me.png')], ['Accept' => 'application/json'])
            ->assertOk();

        $this->assertSame(1, Activity::where('event', 'avatar-changed')->where('subject_id', $user->id)->count());
    }
}
