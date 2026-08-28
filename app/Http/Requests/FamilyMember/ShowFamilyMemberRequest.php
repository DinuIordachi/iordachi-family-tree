<?php

namespace App\Http\Requests\FamilyMember;

use App\Http\Requests\BaseFormRequest;

class ShowFamilyMemberRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }
}
