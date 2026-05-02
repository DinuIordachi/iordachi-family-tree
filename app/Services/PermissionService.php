<?php

namespace App\Services;

use App\Models\User;
use App\Models\Permission;
use App\Repositories\PermissionRepository;

/**
 * Class PermissionService
 *
 * @template-extends BaseRepositoryService<PermissionRepository, \App\Models\Permission>
 *
 * @package App\Services
 */
class PermissionService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(PermissionRepository::class);
    }

    /**
     * Find a permission by name
     *
     * @param string      $name
     * @param string|null $guard
     *
     * @return Permission|null
     */
    public function findByName(string $name, ?string $guard = User::GUARD_NAME): Permission|null
    {
        return $this->repository->findByName($name, $guard);
    }
}