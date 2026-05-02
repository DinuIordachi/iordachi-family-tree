<?php

namespace App\Services;

use App\Repositories\AssociationPersonRoleRepository;

/**
 * Class AssociationPersonRoleService
 *
 * @template-extends BaseRepositoryService<AssociationPersonRoleRepository, \App\Models\AssociationPersonRole>
 *
 * @package App\Services
 */
class AssociationPersonRoleService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(AssociationPersonRoleRepository::class);
    }
}
