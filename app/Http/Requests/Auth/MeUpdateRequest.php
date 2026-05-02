<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Models\Country;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use Illuminate\Validation\Rules\Password;

class MeUpdateRequest extends BaseFormRequest
{
    /* @var array */
    protected array $parseToSnakeCaseIgnoreFields = [
        'taxId', 'workPosition', 'workOrganization',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::ACCOUNT_UPDATE->value);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string'],
            'lastName' => ['nullable', 'string'],
            'email' => ['required', 'email', Rule::unique(User::class, 'email')->ignore($this->user()->id)],
            'birthdate' => ['required', 'date', Rule::date()->beforeOrEqual(now()->subYears(18))],
            /* Country Iso2 Code. Ex:MD or RO */
            'countryCode' => ['required', 'string', 'max:255', Rule::exists(Country::class, 'iso2')],
            'phone' => ['required', 'phone', 'max:255'],
            'gender' => ['nullable', 'in:male,female', 'string'],

            'workPosition' => ['required', 'string', 'max:255'],
            'workOrganization' => ['required', 'string', 'max:255'],

            'avatarFile' => ['nullable', 'file', 'mimes:jpeg,png', 'max:5120'],

            'current_password' => ['nullable', 'current_password'],
            'password' => ['nullable', Password::min(6)->mixedCase()->numbers()->symbols(), 'confirmed'],
        ];
    }
}
