<?php

namespace App\Services;

use App\Repositories\GaragePersonRoleRepository;

/**
 * Class GaragePersonRoleService
 *
 * @template-extends BaseRepositoryService<GaragePersonRoleRepository, \App\Models\GaragePersonRole>
 *
 * @package App\Services
 */
class GaragePersonRoleService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(GaragePersonRoleRepository::class);
    }
}
