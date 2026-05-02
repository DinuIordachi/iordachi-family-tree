<?php

namespace App\Services;

use App\Models\Country;
use App\Repositories\CountryRepository;

/**
 * Class CountryService
 *
 * @template-extends BaseRepositoryService<CountryRepository, \App\Models\Country>
 *
 * @package App\Services
 */
class CountryService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(CountryRepository::class);
    }

    /**
     * Find a country by email
     *
     * @param string|null $iso2
     *
     * @return Country|null
     */
    public function findByIso2(?string $iso2): ?Country
    {
        if (empty($iso2)) {
            return null;
        }

        return $this->repository->findByIso2($iso2);
    }

    /**
     * Find a country by email code
     *
     * @param string|null $iso3
     *
     * @return Country|null
     */
    public function findByIso3(?string $iso3): ?Country
    {
        if (empty($iso2)) {
            return null;
        }

        return $this->repository->findByIso3($iso3);
    }
}