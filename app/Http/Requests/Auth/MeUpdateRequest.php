<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use Illuminate\Validation\Rules\Password;

class MeUpdateRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::ACCOUNT_UPDATE->value);
    }

    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique(User::class, 'email')->ignore($this->user()->id)],
            'avatarFile' => ['nullable', 'file', 'mimes:jpeg,png', 'max:5120'],
            'currentPassword' => ['nullable', 'current_password'],
            'password' => ['nullable', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
        ];
    }
}
