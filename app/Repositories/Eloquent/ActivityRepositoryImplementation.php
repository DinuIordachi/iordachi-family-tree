<?php

namespace App\Repositories\Eloquent;

use App\Models\Activity;
use App\Repositories\ActivityRepository;

/**
 * Class ActivityRepositoryImplementation
 *
 * @template TModel of \App\Models\Activity
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements ActivityRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class ActivityRepositoryImplementation extends BaseRepositoryImplementation implements ActivityRepository
{
    protected Activity $model;

    public function __construct(Activity $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
