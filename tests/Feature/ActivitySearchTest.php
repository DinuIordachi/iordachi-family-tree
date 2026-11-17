<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Activity;
use App\Models\FamilyMember;
use Illuminate\Support\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivitySearchTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->token = $this->adminToken();
        Activity::query()->delete();
    }

    /** @return list<string> */
    private function descriptions(array $query): array
    {
        return collect(
            $this->withToken($this->token)
                ->getJson('/api/v1/activities?' . http_build_query($query))
                ->assertOk()
                ->json('data')
        )->pluck('description')->sort()->values()->all();
    }

    public function test_search_matches_causer_name(): void
    {
        $mariana = User::factory()->create(['first_name' => 'Mariana', 'last_name' => 'Popescu']);
        Activity::query()->delete();
        activity()->causedBy($mariana)->event('login')->log('logged in');
        activity()->event('login')->log('someone else');

        $this->assertSame(['logged in'], $this->descriptions(['term' => 'marian']));
        $this->assertSame(['logged in'], $this->descriptions(['term' => 'Mariana Popescu']));
        $this->assertSame([], $this->descriptions(['term' => 'zzz']));
    }

    public function test_search_matches_changed_values(): void
    {
        $member = FamilyMember::factory()->create(['birthdate' => '1931-04-02']);
        Activity::query()->delete();
        $member->update(['birthdate' => '1932-04-02']);

        $this->assertCount(1, $this->descriptions(['term' => '1932-04']));
    }

    public function test_search_respects_filters(): void
    {
        activity()->event('login')->log('x one');
        activity()->event('logout')->log('x two');

        $this->assertSame(['x one'], $this->descriptions(['term' => 'x', 'event' => 'login']));
    }

    public function test_causer_and_subject_type_filters(): void
    {
        $user = User::factory()->create();
        $member = FamilyMember::factory()->create();
        Activity::query()->delete();
        activity()->causedBy($user)->performedOn($member)->log('by user on member');
        activity()->performedOn($user)->log('on user');

        $this->assertSame(['by user on member'], $this->descriptions(['causerId' => $user->id]));
        $this->assertSame(['by user on member'], $this->descriptions(['subjectType' => 'family-member']));
        $this->assertSame(['on user'], $this->descriptions(['subjectType' => 'user']));
    }

    public function test_date_range_filter(): void
    {
        activity()->createdAt(Carbon::parse('2026-11-01 10:00'))->log('early');
        activity()->createdAt(Carbon::parse('2026-11-10 23:30'))->log('late');

        $this->assertSame(['late'], $this->descriptions(['dateFrom' => '2026-11-05']));
        $this->assertSame(['early'], $this->descriptions(['dateTo' => '2026-11-05']));
        $this->assertSame(['late'], $this->descriptions(['dateFrom' => '2026-11-10', 'dateTo' => '2026-11-10']));
    }

    public function test_page_size_is_honoured(): void
    {
        foreach (range(1, 30) as $i) {
            activity()->log("row {$i}");
        }

        $this->withToken($this->token)
            ->getJson('/api/v1/activities?pageSize=5')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonCount(5, 'data');
    }

    public function test_literal_wildcards_in_term(): void
    {
        activity()->log('100% done');
        activity()->log('snake_case thing');
        activity()->log('plain text');

        $this->assertSame(['100% done'], $this->descriptions(['term' => '%']));
        $this->assertSame(['snake_case thing'], $this->descriptions(['term' => '_']));
        $this->assertSame([], $this->descriptions(['term' => "'\")"]));
    }
}
