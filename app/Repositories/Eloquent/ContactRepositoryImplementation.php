<?php

namespace App\Repositories\Eloquent;

use App\Models\Contact;
use App\Repositories\ContactRepository;

/**
 * Class ContactRepositoryImplementation
 *
 * @template TModel of \App\Models\Contact
 *
 * @extends BaseRepositoryImplementation<TModel>
 * @implements ContactRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class ContactRepositoryImplementation extends BaseRepositoryImplementation implements ContactRepository
{
    protected Contact $model;

    public function __construct(Contact $model)
    {
        parent::__construct($model);
        $this->model = $model;
    }
}
