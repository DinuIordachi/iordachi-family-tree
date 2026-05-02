<?php

namespace App\Repositories;

use App\Models\Permission;

/**
 * Interface PermissionRepository
 *
 * @extends EloquentRepository<\App\Models\Permission>
 *
 * @package App\Repositories
 */
interface PermissionRepository extends EloquentRepository
{
    public function findByName(string $name): ?Permission;
}
