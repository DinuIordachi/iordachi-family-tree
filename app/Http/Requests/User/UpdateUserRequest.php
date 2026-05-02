<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::UPDATE->value, $this->user);
    }

    public function rules(): array
    {
        return [
            'firstName' => ['sometimes', 'required', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:255',
                Rule::unique(User::class, 'email')->ignore($this->user->id),
            ],
            'password' => ['nullable', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string'],
            'avatarFile' => ['nullable', 'file', 'mimes:jpeg,png', 'max:5120'],
            'blockedAt' => ['nullable', 'date'],
        ];
    }
}
