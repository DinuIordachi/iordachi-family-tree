<?php

namespace App\Repositories\Eloquent;

use App\Models\FamilyMember;
use App\Repositories\FamilyMemberRepository;

/**
 * @template TModel of \App\Models\FamilyMember
 *
 * @extends BaseRepositoryImplementation<TModel>
 */
class FamilyMemberRepositoryImplementation extends BaseRepositoryImplementation implements FamilyMemberRepository
{
    public function __construct(FamilyMember $model)
    {
        parent::__construct($model);
    }
}
