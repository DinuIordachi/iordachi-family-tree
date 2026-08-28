<?php

namespace App\Http\Requests\FamilyMember;

use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class UpdateFamilyMemberRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::UPDATE->value, $this->route('family_member'));
    }

    public function rules(): array
    {
        $memberId = $this->route('family_member')?->id;

        return [
            'firstName' => ['sometimes', 'required', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'birthdate' => ['nullable', 'date'],
            'diedAt' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:M,F'],
            'biography' => ['nullable', 'string', 'max:10000'],

            'parentIds' => ['nullable', 'array', 'max:2'],
            'parentIds.*' => [
                'integer',
                Rule::exists('family_members', 'id')->whereNull('deleted_at'),
                Rule::notIn([$memberId]),
            ],

            'spouseIds' => ['nullable', 'array'],
            'spouseIds.*' => [
                'integer',
                Rule::exists('family_members', 'id')->whereNull('deleted_at'),
                Rule::notIn([$memberId]),
            ],

            'childIds' => ['nullable', 'array'],
            'childIds.*' => [
                'integer',
                Rule::exists('family_members', 'id')->whereNull('deleted_at'),
                Rule::notIn([$memberId]),
            ],
        ];
    }
}
