<?php

namespace Tests\Feature;

use App\Models\FamilyMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyMemberSearchTest extends TestCase
{
    use RefreshDatabase;

    private function names(?string $term): array
    {
        return FamilyMember::query()->search($term)->orderBy('first_name')->pluck('first_name')->all();
    }

    public function test_it_matches_each_word_against_the_names_case_insensitively(): void
    {
        FamilyMember::factory()->create(['first_name' => 'Ion', 'last_name' => 'Mandru']);
        FamilyMember::factory()->create(['first_name' => 'Ion', 'last_name' => 'Iordachi']);
        FamilyMember::factory()->create(['first_name' => 'Elena', 'last_name' => 'Mandru']);

        $this->assertSame(['Elena', 'Ion'], $this->names('mandru'));
        $this->assertSame(['Ion'], $this->names('  ION   mandru '));
        $this->assertSame(['Elena', 'Ion', 'Ion'], $this->names(''));
        $this->assertSame(['Elena', 'Ion', 'Ion'], $this->names(null));
    }

    public function test_the_search_does_not_leak_past_soft_deletes(): void
    {
        FamilyMember::factory()->create(['first_name' => 'Ion', 'last_name' => 'Mandru']);
        FamilyMember::factory()->create(['first_name' => 'Elena', 'last_name' => 'Mandru'])->delete();

        $this->assertSame(['Ion'], $this->names('mandru'));
    }

    public function test_the_paginated_api_filters_by_term(): void
    {
        FamilyMember::factory()->create(['first_name' => 'Natalia', 'last_name' => 'Mandru']);
        FamilyMember::factory()->create(['first_name' => 'Vasile', 'last_name' => 'Iordachi']);

        $this->getJson('/api/v1/family-tree?asTree=false&term=natal')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);
    }
}
