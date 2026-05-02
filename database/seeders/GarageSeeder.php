<?php

namespace Database\Seeders;

use App\Models\Garage;
use App\Models\Association;
use Illuminate\Database\Seeder;

class GarageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $association1 = Association::where('name', 'Asociația Proprietarilor de Garaje Nr. 1')->firstOrFail();
        $association2 = Association::where('name', 'Asociația Proprietarilor de Garaje Nr. 2')->firstOrFail();
        $association3 = Association::where('name', 'Asociația Proprietarilor de Garaje Nr. 3')->firstOrFail();

        $garages = [
            // Association 1 — 5 garages (Chișinău)
            [
                'association_id'   => $association1->id,
                'name'             => 'Garaj Nr. 1',
                'status'           => 'normal',
                'city'             => 'Chișinău',
                'street'           => 'str. Florilor',
                'internal_address' => 'Bloc A',
                'address_number'   => '12',
                'cadastral_number' => '0100422.001.0001',
                'area'             => 18.50,
            ],
            [
                'association_id'   => $association1->id,
                'name'             => 'Garaj Nr. 2',
                'status'           => 'normal',
                'city'             => 'Chișinău',
                'street'           => 'str. Florilor',
                'internal_address' => 'Bloc A',
                'address_number'   => '12',
                'cadastral_number' => '0100422.001.0002',
                'area'             => 22.00,
            ],
            [
                'association_id'   => $association1->id,
                'name'             => 'Garaj Nr. 3',
                'status'           => 'normal',
                'city'             => 'Chișinău',
                'street'           => 'str. Florilor',
                'internal_address' => 'Bloc B',
                'address_number'   => '14',
                'cadastral_number' => '0100422.002.0001',
                'area'             => 20.75,
            ],
            [
                'association_id'   => $association1->id,
                'name'             => 'Garaj Nr. 4',
                'status'           => 'seized_by_state',
                'city'             => 'Chișinău',
                'street'           => 'str. Florilor',
                'internal_address' => 'Bloc B',
                'address_number'   => '14',
                'cadastral_number' => '0100422.002.0002',
                'area'             => 19.30,
            ],
            [
                'association_id'   => $association1->id,
                'name'             => 'Garaj Nr. 5',
                'status'           => 'normal',
                'city'             => 'Chișinău',
                'street'           => 'str. Trandafirilor',
                'internal_address' => null,
                'address_number'   => '3',
                'cadastral_number' => '0100422.003.0001',
                'area'             => 35.00,
            ],
            // Association 2 — 3 garages (Bălți)
            [
                'association_id'   => $association2->id,
                'name'             => 'Garaj Nr. 6',
                'status'           => 'normal',
                'city'             => 'Bălți',
                'street'           => 'str. Independenței',
                'internal_address' => null,
                'address_number'   => '45',
                'cadastral_number' => '0200311.001.0001',
                'area'             => 16.00,
            ],
            [
                'association_id'   => $association2->id,
                'name'             => 'Garaj Nr. 7',
                'status'           => 'normal',
                'city'             => 'Bălți',
                'street'           => 'str. Independenței',
                'internal_address' => null,
                'address_number'   => '45',
                'cadastral_number' => '0200311.001.0002',
                'area'             => 24.50,
            ],
            [
                'association_id'   => $association2->id,
                'name'             => 'Garaj Nr. 8',
                'status'           => 'under_state_investigation',
                'city'             => 'Bălți',
                'street'           => 'str. Ștefan cel Mare',
                'internal_address' => 'Rândul 2',
                'address_number'   => '10',
                'cadastral_number' => '0200311.002.0001',
                'area'             => 28.80,
            ],
            // Association 3 — 2 garages (Cahul)
            [
                'association_id'   => $association3->id,
                'name'             => 'Garaj Nr. 9',
                'status'           => 'normal',
                'city'             => 'Cahul',
                'street'           => 'bd. Republicii',
                'internal_address' => null,
                'address_number'   => '7',
                'cadastral_number' => '7701100.001.0001',
                'area'             => 50.00,
            ],
            [
                'association_id'   => $association3->id,
                'name'             => 'Garaj Nr. 10',
                'status'           => 'normal',
                'city'             => 'Cahul',
                'street'           => 'bd. Republicii',
                'internal_address' => null,
                'address_number'   => '9',
                'cadastral_number' => '7701100.001.0002',
                'area'             => 42.60,
            ],
        ];

        foreach ($garages as $data) {
            Garage::firstOrCreate(
                ['cadastral_number' => $data['cadastral_number']],
                $data,
            );
        }
    }
}
