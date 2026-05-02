<?php

namespace Database\Seeders;

use App\Models\Association;
use Illuminate\Database\Seeder;

class AssociationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $associations = [
            [
                'name'               => 'Asociația Proprietarilor de Garaje Nr. 1',
                'address'            => 'str. Florilor 12, Chișinău, MD-2001',
                'phone'              => '+373 22 123 456',
                'cadastral_numbers'  => ['0100422.001', '0100422.002', '0100422.003'],
            ],
            [
                'name'               => 'Asociația Proprietarilor de Garaje Nr. 2',
                'address'            => 'str. Independenței 45, Bălți, MD-3100',
                'phone'              => '+373 231 56 789',
                'cadastral_numbers'  => ['0200311.001', '0200311.002'],
            ],
            [
                'name'               => 'Asociația Proprietarilor de Garaje Nr. 3',
                'address'            => 'bd. Republicii 7, Cahul, MD-3900',
                'phone'              => '+373 299 21 345',
                'cadastral_numbers'  => ['7701100.001', '7701100.002', '7701100.003'],
            ],
        ];

        foreach ($associations as $data) {
            Association::firstOrCreate(
                ['name' => $data['name']],
                $data,
            );
        }
    }
}
