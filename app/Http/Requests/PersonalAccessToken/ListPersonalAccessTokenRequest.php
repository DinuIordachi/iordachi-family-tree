<?php

namespace App\Http\Requests\PersonalAccessToken;

use App\Models\User;
use App\Models\PersonalAccessToken;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ListPersonalAccessTokenRequest extends BaseFormRequest
{
    /**
     * Order by columns
     *
     * @var array|string[]
     */
    protected array $orderByColumns = [
        'id' => 'id',
        'name' => 'name',
        'userAgent' => 'user_agent',
        'issued.ip' => 'issued_ip',
        'issued.countryCode' => 'issued_country_code',
        'issued.country' => 'issued_country',
        'last.ip' => 'last_ip',
        'last.countryCode' => 'last_country_code',
        'last.country' => 'last_country',
        'last.usedAt' => 'used_at',
        'expiresAt' => 'expires_at',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::VIEW_ANY->value, PersonalAccessToken::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $this->merge([
            'expired' => $this->has('expired')
                ? filter_var($this->input('expired'), FILTER_VALIDATE_BOOLEAN)
                : null,
        ]);

        return [
            // Filters
            'term' => ['nullable', 'string'],
            'userAgent' => ['nullable', 'string'],
            'lastIp' => ['nullable', 'ipv4'],
            'lastCountryCode' => ['nullable', 'string'],
            'issuedIp' => ['nullable', 'ipv4'],
            'issuedCountryCode' => ['nullable', 'string'],
            'expired' => ['nullable', 'boolean'],
            'user' => ['nullable'],

            // Pagination
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }


}
