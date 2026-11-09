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

        $this->assertSame(25, FamilyMember::query()->count());
        $this->assertSame('2001-11-03', FamilyMember::query()->where('first_name', 'Dumitru')->whereNotNull('birthdate')->sole()->birthdate->toDateString());
        $this->assertSame('1990-09-22', FamilyMember::query()->where('first_name', 'Ion')->where('last_name', 'Iordachi')->whereNotNull('birthdate')->sole()->birthdate->toDateString());
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

        $ion = FamilyMember::query()->where('first_name', 'Ion')->where('last_name', 'Iordachi')->whereNotNull('birthdate')->sole();
        $this->assertSame(['Victoria Iordachi'], $this->names($ion->spouses));
        $this->assertSame(['Dragos Iordachi', 'Razvan Iordachi'], $this->names($ion->children));
        $this->assertSame(['Ion Iordachi', 'Victoria Iordachi'], $this->names($this->member('Dragos')->parents));
        $this->assertStringContainsString('Pituscanu', $this->member('Victoria')->biography);
        $this->assertStringContainsString('10 mai 2025', $this->member('Victoria')->biography);
    }

    public function test_vasile_and_his_siblings_are_children_of_ion_and_zinaida(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $bunicul = FamilyMember::query()->where('first_name', 'Ion')->where('last_name', 'Iordachi')->whereNull('birthdate')->sole();
        $this->assertSame(['Zinaida Iordachi'], $this->names($bunicul->spouses));
        $this->assertStringContainsString('Popescu', $this->member('Zinaida')->biography);
        $this->assertSame(
            ['Dumitru Iordachi', 'Galina Pituscan', 'Maria Boistean', 'Simion Iordachi', 'Vasile Iordachi'],
            $this->names($bunicul->children),
        );
        $this->assertSame(0, FamilyMember::query()->where('first_name', 'like', '%lui Vasile%')->count());
        $this->assertSame(['Elena Iordachi'], $this->names(FamilyMember::query()->where('first_name', 'Dumitru')->whereNull('birthdate')->sole()->spouses));
        $this->assertSame(['Lidia Iordachi'], $this->names($this->member('Simion')->spouses));
        $this->assertSame(['Vova Boistean'], $this->names($this->member('Maria', 'Boistean')->spouses));
        $this->assertSame(['Mihail Pituscan'], $this->names($this->member('Galina', 'Pituscan')->spouses));
    }

    public function test_alexandra_is_the_daughter_of_iacov_and_eufrosenia_rapcea(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $alexandra = $this->member('Alexandra');
        $this->assertStringContainsString('Rapcea', $alexandra->biography);
        $this->assertSame(['Eufrosenia Rapcea', 'Iacov Rapcea'], $this->names($alexandra->parents));
        $this->assertSame(['Eufrosenia Rapcea'], $this->names($this->member('Iacov', 'Rapcea')->spouses));
    }

    public function test_alexandras_brothers_and_sisters_and_their_spouses(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $iacov = $this->member('Iacov', 'Rapcea');
        $this->assertSame(
            ['Alexandra Iordachi', 'Galina Rabdau', 'Ion Rapcea', 'Liudmila Potînga'],
            $this->names($iacov->children),
        );
        $this->assertSame('1964-03-21', $this->member('Galina', 'Rabdau')->birthdate->toDateString());
        $this->assertSame('1959-09-27', $this->member('Liudmila', 'Potînga')->birthdate->toDateString());
        $this->assertSame('1957-06-15', $this->member('Ion', 'Rapcea')->birthdate->toDateString());
        $this->assertSame('1958-10-30', $this->member('Valentina', 'Rapcea')->birthdate->toDateString());
        $this->assertStringContainsString('necunoscut', $this->member('Valentina', 'Rapcea')->biography);
        $this->assertSame(['Ion Rabdau'], $this->names($this->member('Galina', 'Rabdau')->spouses));
        $this->assertSame(['Valeriu Potînga'], $this->names($this->member('Liudmila', 'Potînga')->spouses));
        $this->assertSame(['Valentina Rapcea'], $this->names($this->member('Ion', 'Rapcea')->spouses));
    }

    public function test_spouses_known_to_be_deceased_without_a_date_are_marked_deceased(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        foreach ([['Ion', 'Rabdau'], ['Valeriu', 'Potînga']] as [$first, $last]) {
            $m = $this->member($first, $last);
            $this->assertNull($m->died_at);
            $this->assertTrue($m->isDeceased(), "$first $last");
        }
        $this->assertFalse($this->member('Valentina', 'Rapcea')->isDeceased());

        $json = $this->getJson('/api/v1/family-tree')->json('data');
        $rabdau = collect($json)->first(fn ($m) => $m['data']['first name'] === 'Ion' && ($m['data']['last name'] ?? null) === 'Rabdau');
        $this->assertTrue($rabdau['deceased']);
        $this->assertNull($rabdau['diedAt']);
    }

    public function test_uncle_dumitru_is_recorded_as_deceased_in_2024(): void
    {
        $this->seed(IordachiFamilySeeder::class);

        $uncle = FamilyMember::query()->where('first_name', 'Dumitru')->whereNull('birthdate')->sole();
        $this->assertTrue($uncle->isDeceased());
        $this->assertSame(2024, $uncle->died_at->year);
    }
}
