<?php

namespace App\Repositories\Eloquent;

use App\Models\Role;
use App\Models\User;
use App\Repositories\RoleRepository;

/**
 * Class RoleRepositoryImplementation
 *
 * @template TModel of \App\Models\Role
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements RoleRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class RoleRepositoryImplementation extends BaseRepositoryImplementation implements RoleRepository
{
    protected Role $model;

    public function __construct(Role $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }

    /**
     * Find role by name
     *
     * @param string      $name
     * @param string|null $guard
     *
     * @return Role|null
     */
    public function findByName(string $name, ?string $guard = User::GUARD_NAME): ?Role
    {
        return $this->model->where('name', $name)->where('guard_name', $guard)->first();
    }
}
