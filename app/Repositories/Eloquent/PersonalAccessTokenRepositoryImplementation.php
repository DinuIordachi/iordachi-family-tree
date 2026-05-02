<?php

namespace App\Repositories\Eloquent;

use App\Models\PersonalAccessToken;
use App\Repositories\PersonalAccessTokenRepository;

/**
 * Class PersonalAccessTokenRepositoryImplementation
 *
 * @template TModel of \App\Models\PersonalAccessToken
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements PersonalAccessTokenRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class PersonalAccessTokenRepositoryImplementation extends BaseRepositoryImplementation implements
    PersonalAccessTokenRepository
{
    protected PersonalAccessToken $model;

    public function __construct(PersonalAccessToken $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
