<?php

namespace App\Repositories;

use App\Models\Person;

/**
 * Interface PersonRepository
 *
 * @extends EloquentRepository<\App\Models\Person>
 *
 * @package App\Repositories
 */
interface PersonRepository extends EloquentRepository
{
    public function findByNameId(string $nameId): ?Person;
}
