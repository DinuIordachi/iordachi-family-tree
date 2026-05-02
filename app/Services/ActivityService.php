<?php

namespace App\Services;

use App\Repositories\ActivityRepository;

/**
 * Class ActivityService
 *
 * @template-extends BaseRepositoryService<ActivityRepository, \App\Models\Activity>
 *
 * @package App\Services
 */
class ActivityService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(ActivityRepository::class);
    }
}
