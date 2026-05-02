<?php

namespace App\Repositories\Eloquent;

use App\Models\AssociationPersonRole;
use App\Repositories\AssociationPersonRoleRepository;

/**
 * Class AssociationPersonRoleRepositoryImplementation
 *
 * @template TModel of \App\Models\AssociationPersonRole
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements AssociationPersonRoleRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class AssociationPersonRoleRepositoryImplementation extends BaseRepositoryImplementation implements AssociationPersonRoleRepository
{
    protected AssociationPersonRole $model;

    public function __construct(AssociationPersonRole $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
