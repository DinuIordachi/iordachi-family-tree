<?php

namespace App\Repositories\Eloquent;

use App\Models\Person;
use App\Repositories\PersonRepository;

/**
 * Class PersonRepositoryImplementation
 *
 * @template TModel of \App\Models\Person
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements PersonRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class PersonRepositoryImplementation extends BaseRepositoryImplementation implements PersonRepository
{
    protected Person $model;

    public function __construct(Person $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }

    /**
     * Find person by name_id
     *
     * @param string $nameId
     *
     * @return Person|null
     */
    public function findByNameId(string $nameId): ?Person
    {
        return $this->model->where('name_id', $nameId)->first();
    }
}
