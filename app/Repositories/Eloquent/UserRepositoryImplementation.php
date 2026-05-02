<?php

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Repositories\UserRepository;

/**
 * Class UserRepositoryImplementation
 *
 * @template TModel of \App\Models\User
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements UserRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class UserRepositoryImplementation extends BaseRepositoryImplementation implements UserRepository
{
    protected User $model;

    public function __construct(User $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }

    /**
     * Find user by email
     *
     * @param string $email
     *
     * @return User|null
     */
    public function findByEmail(string $email): ?User
    {
        return $this->model->where('email', $email)->first();
    }

    /**
     * Find user by email code
     *
     * @param string|int $code
     *
     * @return User|null
     */
    public function findByEmailCode(string|int $code): ?User
    {
        return $this->model->where('email_code', $code)->first();
    }
}
