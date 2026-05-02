<?php

namespace App\Repositories\Eloquent;

use App\Models\Permission;
use App\Models\User;
use App\Repositories\PermissionRepository;

/**
 * Class PermissionRepositoryImplementation
 *
 * @template TModel of \App\Models\Permission
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements PermissionRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class PermissionRepositoryImplementation extends BaseRepositoryImplementation implements PermissionRepository
{
    protected Permission $model;

    public function __construct(Permission $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }

    /**
     * Find permission by name
     *
     * @param string      $name
     * @param string|null $guard
     *
     * @return Permission|null
     */
    public function findByName(string $name, ?string $guard = User::GUARD_NAME): ?Permission
    {
        return $this->model->where('name', $name)->where('guard_name', $guard)->first();
    }
}
