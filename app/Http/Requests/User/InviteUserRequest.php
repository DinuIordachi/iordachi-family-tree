<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class InviteUserRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::INVITE->value, User::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'invites' => ['required', 'array'],
            'invites.*.firstName' => ['required', 'string'],
            'invites.*.lastName' => ['nullable', 'string'],
            'invites.*.email' => ['required', 'email', Rule::unique(User::class, 'email')],
            'invites.*.phone' => ['nullable', 'phone', 'string'],
            'invites.*.roles' => ['nullable', 'array'],
            'invites.*.roles.*' => ['nullable', 'string'],
        ];
    }

    /**
     * Define attributes
     *
     * @return string[]
     */
    public function attributes(): array
    {
        return [
            'invites.*.firstName' => 'first name',
            'invites.*.lastName' => 'last name',
            'invites.*.email' => 'email',
            'invites.*.phone' => 'phone',
        ];
    }
}
