<?php

namespace App\Services;

use App\Repositories\AssociationRepository;

/**
 * Class AssociationService
 *
 * @template-extends BaseRepositoryService<AssociationRepository, \App\Models\Association>
 *
 * @package App\Services
 */
class AssociationService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(AssociationRepository::class);
    }
}
