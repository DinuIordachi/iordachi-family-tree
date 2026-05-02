<?php

namespace App\Http\Requests\PersonalAccessToken;

use App\Models\PersonalAccessToken;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ListPersonalAccessTokenRequest extends BaseFormRequest
{
    protected array $orderByColumns = [
        'id' => 'id',
        'name' => 'name',
        'userAgent' => 'user_agent',
        'issuedIp' => 'issued_ip',
        'lastIp' => 'last_ip',
        'lastUsedAt' => 'last_used_at',
        'expiresAt' => 'expires_at',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::VIEW_ANY->value, PersonalAccessToken::class);
    }

    public function rules(): array
    {
        $this->merge([
            'expired' => $this->has('expired')
                ? filter_var($this->input('expired'), FILTER_VALIDATE_BOOLEAN)
                : null,
        ]);

        return [
            'term' => ['nullable', 'string'],
            'userAgent' => ['nullable', 'string'],
            'lastIp' => ['nullable', 'ipv4'],
            'issuedIp' => ['nullable', 'ipv4'],
            'expired' => ['nullable', 'boolean'],
            'user' => ['nullable'],

            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'orderBy' => ['nullable', 'string', Rule::in(array_keys($this->getOrderByColumns()))],
            'orderDirection' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }
}
