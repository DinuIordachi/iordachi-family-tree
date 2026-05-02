<?php

namespace App\Repositories;

use App\Models\User;

/**
 * Interface UserRepository
 *
 * @extends EloquentRepository<\App\Models\User>
 *
 * @package App\Repositories
 */
interface UserRepository extends EloquentRepository
{
    public function findByEmail(string $email): ?User;

    public function findByEmailCode(string|int $code): ?User;
}
