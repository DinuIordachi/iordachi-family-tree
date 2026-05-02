<?php

namespace App\Services;

use App\Repositories\DomainRoleRepository;

/**
 * Class DomainRoleService
 *
 * @template-extends BaseRepositoryService<DomainRoleRepository, \App\Models\DomainRole>
 *
 * @package App\Services
 */
class DomainRoleService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(DomainRoleRepository::class);
    }
}
