<?php

namespace App\Http\Requests\Person;

use App\Models\Person;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ListPersonRequest extends BaseFormRequest
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
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Person::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Filters
            'term' => ['nullable', 'string'],

            // Pagination
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }
}
