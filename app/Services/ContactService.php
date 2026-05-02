<?php

namespace App\Services;

use App\Repositories\ContactRepository;

/**
 * Class ContactService
 *
 * @template-extends BaseRepositoryService<ContactRepository, \App\Models\Contact>
 *
 * @package App\Services
 */
class ContactService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(ContactRepository::class);
    }
}
