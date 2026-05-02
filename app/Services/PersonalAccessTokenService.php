<?php

namespace App\Services;

use App\Repositories\PersonalAccessTokenRepository;

/**
 * Class PersonalAccessTokenService
 *
 * @template-extends BaseRepositoryService<PersonalAccessTokenRepository, \App\Models\PersonalAccessToken>
 *
 * @package App\Services
 */
class PersonalAccessTokenService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(PersonalAccessTokenRepository::class);
    }
}