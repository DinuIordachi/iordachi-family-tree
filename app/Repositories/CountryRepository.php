<?php

namespace App\Repositories;

use App\Models\Country;

/**
 * Interface CountryRepository
 *
 * @extends EloquentRepository<\App\Models\Country>
 *
 * @package App\Repositories
 */
interface CountryRepository extends EloquentRepository
{
    public function findByIso2(string $iso2): ?Country;

    public function findByIso3(string $iso3): ?Country;
}
