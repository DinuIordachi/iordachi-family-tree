<?php

namespace App\Http\Requests\FamilyMember;

use App\Enums\PermissionsEnum;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ForceDeleteFamilyMemberRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::FORCE_DELETE->value, $this->route('family_member'));
    }

    public function rules(): array
    {
        return [];
    }
}
