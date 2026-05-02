<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ListUserRequest extends BaseFormRequest
{
    protected array $orderByColumns = [
        'id' => 'id',
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'email' => 'email',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::VIEW_ANY->value, User::class);
    }

    public function rules(): array
    {
        $this->merge([
            'blocked' => $this->has('blocked')
                ? filter_var($this->input('blocked'), FILTER_VALIDATE_BOOLEAN)
                : null,
            'verified' => $this->has('verified')
                ? filter_var($this->input('verified'), FILTER_VALIDATE_BOOLEAN)
                : null,
            'archived' => $this->has('archived')
                ? filter_var($this->input('archived'), FILTER_VALIDATE_BOOLEAN)
                : false,
        ]);

        return [
            'term' => ['nullable', 'string'],
            'firstName' => ['nullable', 'string'],
            'lastName' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'verified' => ['nullable', 'boolean'],
            'blocked' => ['nullable', 'boolean'],
            'archived' => ['nullable', 'boolean'],
            'role' => ['nullable'],

            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }
}
