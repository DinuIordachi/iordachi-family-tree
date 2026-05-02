<?php

namespace App\Repositories;

use App\Models\Role;

/**
 * Interface RoleRepository
 *
 * @extends EloquentRepository<\App\Models\Role>
 *
 * @package App\Repositories
 */
interface RoleRepository extends EloquentRepository
{
    public function findByName(string $name): ?Role;
}
