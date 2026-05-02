<?php

namespace App\Http\Requests\World;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ListCountryRequest extends BaseFormRequest
{
    /**
     * Order by columns
     *
     * @var array|string[]
     */
    protected array $orderByColumns = [
        'id' => 'id',
        'iso2' => 'iso2',
        'iso3' => 'iso3',
        'name' => 'name',
        'phoneCode' => 'phone_code',
        'region' => 'region',
        'subregion' => 'subregion',
    ];

//    /**
//     * Field columns
//     *
//     * @var array|string[]
//     */
//    protected array $fieldColumns = [
//        'iso2' => 'iso2',
//        'iso3' => 'iso3',
//        'name' => 'name',
//        'phoneCode' => 'phone_code',
//        'region' => 'region',
//        'subregion' => 'subregion',
//    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
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
            'iso2' => ['nullable', 'string'],
            'iso3' => ['nullable', 'string'],
            'name' => ['nullable', 'string'],
            'phone_code' => ['nullable', 'int'],
            'region' => ['nullable', 'string'],
            'subregion' => ['nullable', 'string'],

            // Pagination
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],
//            'fields' => ['nullable', 'string', Rule::in(array_keys($this->getFieldColumns()))],
        ];
    }
}
