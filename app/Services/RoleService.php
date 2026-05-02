<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use App\Repositories\RoleRepository;

/**
 * Class RoleService
 *
 * @template-extends BaseRepositoryService<RoleRepository, \App\Models\Role>
 *
 * @package App\Services
 */
class RoleService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(RoleRepository::class);
    }

    /**
     * Find a role by name
     *
     * @param string      $name
     * @param string|null $guard
     *
     * @return Role|null
     */
    public function findByName(string $name, ?string $guard = User::GUARD_NAME): Role|null
    {
        return $this->repository->findByName($name, $guard);
    }
}
