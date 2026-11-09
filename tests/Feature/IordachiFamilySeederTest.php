<?php

namespace Tests\Feature;

use App\Models\FamilyMember;
use Database\Seeders\IordachiFamilySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IordachiFamilySeederTest extends TestCase
{
    use RefreshDatabase;

    private function member(string $first, string $last = 'Iordachi'): FamilyMember
    {
        return FamilyMember::query()->where('first_name', $first)->where('last_name', $last)->sole();
    }

    private function names($members): array
    {
        return $members->map(fn (FamilyMember $m) => "{$m->first_name} {$m->last_name}")->sort()->values()->all();
    }

    public function test_it_seeds_the_real_family_with_their_dates(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $this->assertSame(17, FamilyMember::query()->count());
        $this->assertSame('2001-11-03', FamilyMember::query()->where('first_name', 'Dumitru')->whereNotNull('birthdate')->sole()->birthdate->toDateString());
        $this->assertSame('1990-09-22', $this->member('Ion')->birthdate->toDateString());
        $this->assertSame('1969-02-12', $this->member('Alexandra')->birthdate->toDateString());
        $this->assertSame('1966-08-01', $this->member('Vasile')->birthdate->toDateString());
        $this->assertNull($this->member('Victoria')->birthdate);
        $this->assertNull($this->member('Dragos')->birthdate);
    }

    public function test_it_links_parents_children_and_spouses(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $vasile = $this->member('Vasile');
        $this->assertSame(['Alexandra Iordachi'], $this->names($vasile->spouses));
        $this->assertSame(['Dumitru Iordachi', 'Ion Iordachi'], $this->names($vasile->children));

        $ion = $this->member('Ion');
        $this->assertSame(['Victoria Iordachi'], $this->names($ion->spouses));
        $this->assertSame(['Dragos Iordachi', 'Razvan Iordachi'], $this->names($ion->children));
        $this->assertSame(['Ion Iordachi', 'Victoria Iordachi'], $this->names($this->member('Dragos')->parents));
        $this->assertStringContainsString('Pituscanu', $this->member('Victoria')->biography);
        $this->assertStringContainsString('10 mai 2025', $this->member('Victoria')->biography);
    }

    public function test_vasile_and_his_siblings_share_placeholder_parents(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $father = $this->member('Tatăl lui Vasile');
        $this->assertSame(['Mama lui Vasile Iordachi'], $this->names($father->spouses));
        $this->assertSame(
            ['Dumitru Iordachi', 'Galina Pituscan', 'Maria Boistean', 'Simion Iordachi', 'Vasile Iordachi'],
            $this->names($father->children),
        );
        $this->assertSame(['Elena Iordachi'], $this->names(FamilyMember::query()->where('first_name', 'Dumitru')->whereNull('birthdate')->sole()->spouses));
        $this->assertSame(['Lidia Iordachi'], $this->names($this->member('Simion')->spouses));
        $this->assertSame(['Vova Boistean'], $this->names($this->member('Maria', 'Boistean')->spouses));
        $this->assertSame(['Mihail Pituscan'], $this->names($this->member('Galina', 'Pituscan')->spouses));
    }

    public function test_uncle_dumitru_is_recorded_as_deceased_in_2024(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $uncle = FamilyMember::query()->where('first_name', 'Dumitru')->whereNull('birthdate')->sole();
        $this->assertTrue($uncle->isDeceased());
        $this->assertSame(2024, $uncle->died_at->year);
    }
}
