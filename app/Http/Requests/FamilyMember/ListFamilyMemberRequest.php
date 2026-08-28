<?php

namespace App\Http\Requests\FamilyMember;

use Illuminate\Validation\Rule;
use App\Http\Requests\BaseFormRequest;

class ListFamilyMemberRequest extends BaseFormRequest
{
    protected array $orderByColumns = [
        'id' => 'id',
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'birthdate' => 'birthdate',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $this->merge([
            'archived' => $this->has('archived')
                ? filter_var($this->input('archived'), FILTER_VALIDATE_BOOLEAN)
                : null,
            'asTree' => $this->has('asTree')
                ? filter_var($this->input('asTree'), FILTER_VALIDATE_BOOLEAN)
                : true,
        ]);

        return [
            'term' => ['nullable', 'string'],
            'firstName' => ['nullable', 'string'],
            'lastName' => ['nullable', 'string'],
            'gender' => ['nullable', 'in:M,F'],
            'bornAfter' => ['nullable', 'date'],
            'bornBefore' => ['nullable', 'date'],
            'archived' => ['nullable', 'boolean'],

            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],

            /* When true, return full unpaginated tree shape. Default true. */
            'asTree' => ['nullable', 'boolean'],
        ];
    }
}
