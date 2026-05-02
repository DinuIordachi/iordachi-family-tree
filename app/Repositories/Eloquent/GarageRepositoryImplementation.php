<?php

namespace App\Repositories\Eloquent;

use App\Models\Garage;
use App\Repositories\GarageRepository;

/**
 * Class GarageRepositoryImplementation
 *
 * @template TModel of \App\Models\Garage
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements GarageRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class GarageRepositoryImplementation extends BaseRepositoryImplementation implements GarageRepository
{
    protected Garage $model;

    public function __construct(Garage $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
