<?php

namespace Database\Seeders;

use App\Models\FamilyMember;
use Illuminate\Database\Seeder;

/**
 * The Iordachi family as known today. Names and notes are kept in Romanian, as given.
 * Unknown dates stay empty; maiden names and marriage dates live in the biography,
 * since the model has no dedicated columns for them.
 *
 * Grandparents: Ion and Zinaida Iordachi (Vasile's parents), Iacov and Eufrosenia Rapcea
 * (Alexandra's parents). Their dates are not known yet.
 */
class IordachiFamilySeeder extends Seeder
{
    public function run(): void
    {
        // Vasile's parents
        $bunicul = $this->person('Ion', 'Iordachi', 'M', bio: 'Tatăl lui Vasile Iordachi.');
        $bunica = $this->person('Zinaida', 'Iordachi', 'F', bio: 'Mama lui Vasile Iordachi. Numele de fată mare: Popescu.');
        $this->marry($bunicul, $bunica);

        // Vasile and his siblings
        $vasile = $this->person('Vasile', 'Iordachi', 'M', '1966-08-01', bio: 'Tata.');
        $dumitruUnchi = $this->person('Dumitru', 'Iordachi', 'M', diedAt: '2024-01-01 00:00:00', bio: 'Fratele lui Vasile Iordachi. Decedat în 2024.');
        $simion = $this->person('Simion', 'Iordachi', 'M', bio: 'Fratele lui Vasile Iordachi.');
        $maria = $this->person('Maria', 'Boistean', 'F', bio: 'Sora lui Vasile Iordachi. Născută Iordachi (Boistean după căsătorie).');
        $galina = $this->person('Galina', 'Pituscan', 'F', bio: 'Sora lui Vasile Iordachi. Născută Iordachi (Pituscan după căsătorie).');
        foreach ([$vasile, $dumitruUnchi, $simion, $maria, $galina] as $child) {
            $child->parents()->sync([$bunicul->id, $bunica->id]);
        }

        // Their spouses
        $alexandra = $this->person('Alexandra', 'Iordachi', 'F', '1969-02-12', bio: 'Mama. Numele de fată mare: Rapcea.');
        $this->marry($vasile, $alexandra);

        // Alexandra's parents
        $iacov = $this->person('Iacov', 'Rapcea', 'M', bio: 'Tatăl Alexandrei Iordachi.');
        $eufrosenia = $this->person('Eufrosenia', 'Rapcea', 'F', bio: 'Mama Alexandrei Iordachi. Numele de fată mare necunoscut.');
        $this->marry($iacov, $eufrosenia);
        $alexandra->parents()->sync([$iacov->id, $eufrosenia->id]);

        // Alexandra's brothers and sisters, with their spouses
        $ionRapcea = $this->person('Ion', 'Rapcea', 'M', '1957-06-15', bio: 'Fratele Alexandrei Iordachi.');
        $liudmila = $this->person('Liudmila', 'Potînga', 'F', '1959-09-27', bio: 'Sora Alexandrei Iordachi. Născută Rapcea (Potînga după căsătorie).');
        $galinaRapcea = $this->person('Galina', 'Rabdau', 'F', '1964-03-21', bio: 'Sora Alexandrei Iordachi. Născută Rapcea (Rabdau după căsătorie).');
        foreach ([$ionRapcea, $liudmila, $galinaRapcea] as $child) {
            $child->parents()->sync([$iacov->id, $eufrosenia->id]);
        }
        $this->marry($ionRapcea, $this->person('Valentina', 'Rapcea', 'F', '1958-10-30', bio: 'Soția lui Ion Rapcea. Numele de fată mare necunoscut.'));
        $this->marry($liudmila, $this->person('Valeriu', 'Potînga', 'M', deceased: true, bio: 'Soțul Liudmilei Potînga. Decedat.'));
        $this->marry($galinaRapcea, $this->person('Ion', 'Rabdau', 'M', deceased: true, bio: 'Soțul Galinei Rabdau. Decedat.'));
        $this->marry($dumitruUnchi, $this->person('Elena', 'Iordachi', 'F', bio: 'Soția lui Dumitru Iordachi. Numele de fată mare necunoscut.'));
        $this->marry($simion, $this->person('Lidia', 'Iordachi', 'F', bio: 'Soția lui Simion Iordachi. Numele de fată mare necunoscut.'));
        $this->marry($maria, $this->person('Vova', 'Boistean', 'M', bio: 'Soțul Mariei Boistean.'));
        $this->marry($galina, $this->person('Mihail', 'Pituscan', 'M', bio: 'Soțul Galinei Pituscan.'));

        // Vasile and Alexandra's sons
        $ion = $this->person('Ion', 'Iordachi', 'M', '1990-09-22', bio: 'Fratele lui Dumitru.');
        $dumitru = $this->person('Dumitru', 'Iordachi', 'M', '2001-11-03');
        foreach ([$ion, $dumitru] as $child) {
            $child->parents()->sync([$vasile->id, $alexandra->id]);
        }

        // Ion's family
        $victoria = $this->person('Victoria', 'Iordachi', 'F', bio: 'Numele de fată mare: Pituscanu. Căsătorită cu Ion Iordachi din 10 mai 2025.');
        $this->marry($ion, $victoria);
        $dragos = $this->person('Dragos', 'Iordachi', 'M', bio: 'Fiul mai mare al lui Ion și al Victoriei.');
        $razvan = $this->person('Razvan', 'Iordachi', 'M', bio: 'Fiul mai mic al lui Ion și al Victoriei.');
        foreach ([$dragos, $razvan] as $child) {
            $child->parents()->sync([$ion->id, $victoria->id]);
        }
    }

    private function person(
        string $first,
        string $last,
        string $gender,
        ?string $birthdate = null,
        ?string $diedAt = null,
        ?string $bio = null,
        bool $deceased = false,
    ): FamilyMember {
        return FamilyMember::create([
            'first_name' => $first,
            'last_name' => $last,
            'gender' => $gender,
            'birthdate' => $birthdate,
            'died_at' => $diedAt,
            'is_deceased' => $deceased,
            'biography' => $bio,
        ]);
    }

    private function marry(FamilyMember $a, FamilyMember $b): void
    {
        $a->syncSpouseIds([...$a->spouses()->pluck('family_members.id')->all(), $b->id]);
    }
}
