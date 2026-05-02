<?php

namespace App\Repositories\Eloquent;

use App\Models\GaragePersonRole;
use App\Repositories\GaragePersonRoleRepository;

/**
 * Class GaragePersonRoleRepositoryImplementation
 *
 * @template TModel of \App\Models\GaragePersonRole
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements GaragePersonRoleRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class GaragePersonRoleRepositoryImplementation extends BaseRepositoryImplementation implements GaragePersonRoleRepository
{
    protected GaragePersonRole $model;

    public function __construct(GaragePersonRole $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
