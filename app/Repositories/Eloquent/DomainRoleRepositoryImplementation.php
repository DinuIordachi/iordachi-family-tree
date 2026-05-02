<?php

namespace App\Repositories\Eloquent;

use App\Models\DomainRole;
use App\Repositories\DomainRoleRepository;

/**
 * Class DomainRoleRepositoryImplementation
 *
 * @template TModel of \App\Models\DomainRole
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements DomainRoleRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class DomainRoleRepositoryImplementation extends BaseRepositoryImplementation implements DomainRoleRepository
{
    protected DomainRole $model;

    public function __construct(DomainRole $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
