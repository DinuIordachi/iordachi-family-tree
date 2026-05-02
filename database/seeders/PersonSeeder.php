<?php

namespace Database\Seeders;

use App\Models\Association;
use App\Models\AssociationPersonRole;
use App\Models\Contact;
use App\Models\DomainRole;
use App\Models\Garage;
use App\Models\GaragePersonRole;
use App\Models\Person;
use App\Enums\DomainRoleNameEnum;
use Illuminate\Database\Seeder;

class PersonSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $persons = [
            ['first_name' => 'Ion',       'last_name' => 'Popescu',    'patronymic' => 'Vasile'],
            ['first_name' => 'Maria',     'last_name' => 'Ionescu',    'patronymic' => 'Gheorghe'],
            ['first_name' => 'Andrei',    'last_name' => 'Rusu',       'patronymic' => 'Nicolae'],
            ['first_name' => 'Elena',     'last_name' => 'Munteanu',   'patronymic' => null],
            ['first_name' => 'Vasile',    'last_name' => 'Cojocaru',   'patronymic' => 'Ion'],
            ['first_name' => 'Natalia',   'last_name' => 'Botnaru',    'patronymic' => 'Petru'],
            ['first_name' => 'Gheorghe',  'last_name' => 'Lupașcu',    'patronymic' => null],
            ['first_name' => 'Tatiana',   'last_name' => 'Grigorescu', 'patronymic' => 'Andrei'],
            ['first_name' => 'Dumitru',   'last_name' => 'Balan',      'patronymic' => 'Ion'],
            ['first_name' => 'Olga',      'last_name' => 'Chiriac',    'patronymic' => null],
            ['first_name' => 'Alexandru', 'last_name' => 'Rotaru',     'patronymic' => 'Vasile'],
            ['first_name' => 'Valentina', 'last_name' => 'Popa',       'patronymic' => 'Dumitru'],
            ['first_name' => 'Mihai',     'last_name' => 'Stoian',     'patronymic' => 'Gheorghe'],
            ['first_name' => 'Irina',     'last_name' => 'Timofei',    'patronymic' => null],
            ['first_name' => 'Petru',     'last_name' => 'Vrabie',     'patronymic' => 'Alexandru'],
        ];

        $contacts = [
            [['type' => 'email',  'value' => 'ion.popescu@gmail.com'],   ['type' => 'phone', 'value' => '+37369101001']],
            [['type' => 'phone',  'value' => '+37369201002']],
            [['type' => 'email',  'value' => 'andrei.rusu@mail.md'],     ['type' => 'phone', 'value' => '+37369301003']],
            [['type' => 'phone',  'value' => '+37369401004']],
            [['type' => 'email',  'value' => 'vasile.cojocaru@yahoo.com'], ['type' => 'phone', 'value' => '+37369501005']],
            [['type' => 'phone',  'value' => '+37369601006']],
            [['type' => 'email',  'value' => 'gheorghe.lupascu@gmail.com']],
            [['type' => 'phone',  'value' => '+37369801008'], ['type' => 'email', 'value' => 'tatiana.g@mail.md']],
            [['type' => 'email',  'value' => 'dumitru.balan@gmail.com']],
            [['type' => 'phone',  'value' => '+37369001010']],
            [['type' => 'email',  'value' => 'alex.rotaru@mail.md'],     ['type' => 'phone', 'value' => '+37368111011']],
            [['type' => 'phone',  'value' => '+37368221012']],
            [['type' => 'email',  'value' => 'mihai.stoian@gmail.com'],  ['type' => 'phone', 'value' => '+37368331013']],
            [['type' => 'phone',  'value' => '+37368441014']],
            [['type' => 'email',  'value' => 'petru.vrabie@mail.md'],    ['type' => 'phone', 'value' => '+37368551015']],
        ];

        $createdPersons = [];

        foreach ($persons as $i => $personData) {
            $person = Person::firstOrCreate(
                [
                    'first_name' => $personData['first_name'],
                    'last_name'  => $personData['last_name'],
                ],
                $personData,
            );

            foreach ($contacts[$i] as $j => $contactData) {
                Contact::firstOrCreate(
                    [
                        'person_id' => $person->id,
                        'value'     => $contactData['value'],
                    ],
                    [
                        'person_id' => $person->id,
                        'type'      => $contactData['type'],
                        'value'     => $contactData['value'],
                        'favorite'  => $j === 0,
                        'whatsapp'  => false,
                        'viber'     => false,
                        'telegram'  => false,
                        'calls'     => $contactData['type'] === 'phone',
                        'sms'       => $contactData['type'] === 'phone',
                    ],
                );
            }

            $createdPersons[] = $person;
        }

        // Retrieve roles
        $ownerRole = DomainRole::where('name', DomainRoleNameEnum::OWNER->value)->firstOrFail();
        $memberRole = DomainRole::where('name', DomainRoleNameEnum::MEMBER->value)->firstOrFail();
        $presidentRole = DomainRole::where('name', DomainRoleNameEnum::PRESIDENT->value)->firstOrFail();
        $secretaryRole = DomainRole::where('name', DomainRoleNameEnum::SECRETARY->value)->firstOrFail();

        // Assign garage roles — each garage gets at least 1 owner
        $garages = Garage::orderBy('id')->get();

        $garageOwnerAssignments = [
            0  => 0,  // Garaj Nr.1  → Ion Popescu
            1  => 1,  // Garaj Nr.2  → Maria Ionescu
            2  => 2,  // Garaj Nr.3  → Andrei Rusu
            3  => 3,  // Garaj Nr.4  → Elena Munteanu
            4  => 4,  // Garaj Nr.5  → Vasile Cojocaru
            5  => 5,  // Garaj Nr.6  → Natalia Botnaru
            6  => 6,  // Garaj Nr.7  → Gheorghe Lupașcu
            7  => 7,  // Garaj Nr.8  → Tatiana Grigorescu
            8  => 8,  // Garaj Nr.9  → Dumitru Balan
            9  => 9,  // Garaj Nr.10 → Olga Chiriac
        ];

        foreach ($garages as $index => $garage) {
            $personIndex = $garageOwnerAssignments[$index] ?? $index % count($createdPersons);
            GaragePersonRole::firstOrCreate(
                [
                    'garage_id' => $garage->id,
                    'role_id'   => $ownerRole->id,
                    'person_id' => $createdPersons[$personIndex]->id,
                ],
                [
                    'ownership_percentage' => 100.00,
                ],
            );
        }

        // Assign association roles
        $associations = Association::orderBy('id')->get();

        // persons 10-14 are "extra" — use them for association roles alongside others
        $associationRoleAssignments = [
            // Association 1 — president: person[10], secretary: person[11], members: [0,1,2,3,4]
            0 => [
                'president' => 10,
                'secretary' => 11,
                'members'   => [0, 1, 2, 3, 4],
            ],
            // Association 2 — president: person[12], secretary: person[13], members: [5,6,7]
            1 => [
                'president' => 12,
                'secretary' => 13,
                'members'   => [5, 6, 7],
            ],
            // Association 3 — president: person[14], secretary: person[9], members: [8,9]
            2 => [
                'president' => 14,
                'secretary' => 9,
                'members'   => [8, 9],
            ],
        ];

        foreach ($associations as $assocIndex => $association) {
            $assignment = $associationRoleAssignments[$assocIndex];

            // President
            AssociationPersonRole::firstOrCreate(
                [
                    'association_id' => $association->id,
                    'role_id'        => $presidentRole->id,
                    'person_id'      => $createdPersons[$assignment['president']]->id,
                ],
                [
                    'start_date' => now()->subYears(2)->toDateString(),
                    'end_date'   => null,
                    'is_active'  => true,
                ],
            );

            // Secretary
            AssociationPersonRole::firstOrCreate(
                [
                    'association_id' => $association->id,
                    'role_id'        => $secretaryRole->id,
                    'person_id'      => $createdPersons[$assignment['secretary']]->id,
                ],
                [
                    'start_date' => now()->subYears(2)->toDateString(),
                    'end_date'   => null,
                    'is_active'  => true,
                ],
            );

            // Members
            foreach ($assignment['members'] as $memberIndex) {
                AssociationPersonRole::firstOrCreate(
                    [
                        'association_id' => $association->id,
                        'role_id'        => $memberRole->id,
                        'person_id'      => $createdPersons[$memberIndex]->id,
                    ],
                    [
                        'start_date' => now()->subYear()->toDateString(),
                        'end_date'   => null,
                        'is_active'  => true,
                    ],
                );
            }
        }
    }
}
