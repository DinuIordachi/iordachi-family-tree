<?php

namespace Database\Seeders;

use App\Models\FamilyMember;
use Illuminate\Database\Seeder;

/**
 * Seeds the same Iordachi sample tree the front-office page used as
 * placeholder data — gives the API something to return out of the box.
 */
class FamilyMemberSeeder extends Seeder
{
    public function run(): void
    {
        $vasile = FamilyMember::create(['first_name' => 'Vasile', 'last_name' => 'Iordachi', 'birthdate' => '1925-04-12', 'gender' => 'M', 'died_at' => '1998-11-03 14:20:00']);
        $maria = FamilyMember::create(['first_name' => 'Maria', 'last_name' => 'Iordachi', 'birthdate' => '1928-09-30', 'gender' => 'F', 'died_at' => '2004-06-17 09:05:00']);
        $ion = FamilyMember::create(['first_name' => 'Ion', 'last_name' => 'Iordachi', 'birthdate' => '1955-01-08', 'gender' => 'M']);
        $elena = FamilyMember::create(['first_name' => 'Elena', 'last_name' => 'Iordachi', 'birthdate' => '1958-06-21', 'gender' => 'F']);
        $andrei = FamilyMember::create(['first_name' => 'Andrei', 'last_name' => 'Iordachi', 'birthdate' => '1985-03-14', 'gender' => 'M']);
        $ana = FamilyMember::create(['first_name' => 'Ana', 'last_name' => 'Iordachi', 'birthdate' => '1987-11-02', 'gender' => 'F']);
        $mihai = FamilyMember::create(['first_name' => 'Mihai', 'last_name' => 'Iordachi', 'birthdate' => '1988-07-19', 'gender' => 'M']);
        $dinu = FamilyMember::create(['first_name' => 'Dinu', 'last_name' => 'Iordachi', 'birthdate' => '2015-02-25', 'gender' => 'M']);
        $sofia = FamilyMember::create(['first_name' => 'Sofia', 'last_name' => 'Iordachi', 'birthdate' => '2018-08-10', 'gender' => 'F']);

        $vasile->syncSpouseIds([$maria->id]);
        $ion->syncSpouseIds([$elena->id]);
        $andrei->syncSpouseIds([$ana->id]);

        $ion->parents()->sync([$vasile->id, $maria->id]);
        $andrei->parents()->sync([$ion->id, $elena->id]);
        $mihai->parents()->sync([$ion->id, $elena->id]);
        $dinu->parents()->sync([$andrei->id, $ana->id]);
        $sofia->parents()->sync([$andrei->id, $ana->id]);
    }
}
