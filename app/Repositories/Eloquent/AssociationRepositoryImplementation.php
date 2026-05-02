<?php

namespace App\Repositories\Eloquent;

use App\Models\Association;
use App\Repositories\AssociationRepository;

/**
 * Class AssociationRepositoryImplementation
 *
 * @template TModel of \App\Models\Association
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements AssociationRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class AssociationRepositoryImplementation extends BaseRepositoryImplementation implements AssociationRepository
{
    protected Association $model;

    public function __construct(Association $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
