<?php

namespace App\Repositories\Eloquent;

use App\Models\Country;
use App\Repositories\CountryRepository;

/**
 * Class CountryRepositoryImplementation
 *
 * @template TModel of \App\Models\Country
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements CountryRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class CountryRepositoryImplementation extends BaseRepositoryImplementation implements CountryRepository
{
    protected Country $model;

    public function __construct(Country $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }

    /**
     * Find user by email
     *
     * @param string $iso2
     *
     * @return Country|null
     */
    public function findByIso2(string $iso2): ?Country
    {
        return $this->model->newQuery()->where('iso2', $iso2)->first();
    }

    /**
     * Find user by email code
     *
     * @param string $iso3
     *
     * @return Country|null
     */
    public function findByIso3(string $iso3): ?Country
    {
        return $this->model->newQuery()->where('iso3', $iso3)->first();
    }
}
