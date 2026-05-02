<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class InviteUserRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::INVITE->value, User::class);
    }

    public function rules(): array
    {
        return [
            'invites' => ['required', 'array'],
            'invites.*.firstName' => ['required', 'string'],
            'invites.*.lastName' => ['nullable', 'string'],
            'invites.*.email' => ['required', 'email', Rule::unique(User::class, 'email')],
            'invites.*.roles' => ['nullable', 'array'],
            'invites.*.roles.*' => ['nullable', 'string'],
        ];
    }
}
