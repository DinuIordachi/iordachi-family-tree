<?php

namespace App\Services;

use App\Repositories\GarageRepository;

/**
 * Class GarageService
 *
 * @template-extends BaseRepositoryService<GarageRepository, \App\Models\Garage>
 *
 * @package App\Services
 */
class GarageService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(GarageRepository::class);
    }
}
