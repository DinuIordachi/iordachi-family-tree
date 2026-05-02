<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ListUserRequest extends BaseFormRequest
{
    /**
     * Order by columns
     *
     * @var array|string[]
     */
    protected array $orderByColumns = [
        'id' => 'id',
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'email' => 'email',
        'gender' => 'gender',
        'blocked' => 'blocked',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::VIEW_ANY->value, User::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
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
            'paid' => $this->has('paid')
                ? filter_var($this->input('paid'), FILTER_VALIDATE_BOOLEAN)
                : null,
        ]);

        return [
            // Filters
            'term' => ['nullable', 'string'],
            'gender' => ['nullable', 'string', 'in:male,female'],
            'email' => ['nullable', 'string'],
            'firstName' => ['nullable', 'string'],
            'lastName' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'verified' => ['nullable', 'boolean'],
            'blocked' => ['nullable', 'boolean'],
            'role' => ['nullable'],
            'edition' => ['nullable'],
            'archived' => ['nullable', 'boolean'],
            'paid' => ['nullable', 'boolean'],
            'country' => ['nullable', 'string'],

            // Pagination
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }
}
