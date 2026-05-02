<?php

namespace App\Services;

use App\Models\Person;
use App\Repositories\PersonRepository;

/**
 * Class PersonService
 *
 * @template-extends BaseRepositoryService<PersonRepository, \App\Models\Person>
 *
 * @package App\Services
 */
class PersonService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(PersonRepository::class);
    }

    /**
     * Find a person by name_id
     *
     * @param string $nameId
     *
     * @return Person|null
     */
    public function findByNameId(string $nameId): ?Person
    {
        return $this->repository->findByNameId($nameId);
    }
}
