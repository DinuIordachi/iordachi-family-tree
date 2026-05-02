<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Models\Country;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends BaseFormRequest
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
        return Gate::allows(PermissionsEnum::UPDATE->value, $this->user);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255', Rule::unique(User::class, 'email')->ignore($this->user->id),
            ],
            'birthdate' => ['nullable', 'date'],
            /* Country Iso2 Code. Ex:MD or RO */
            'countryCode' => ['nullable', 'string', 'max:255', Rule::exists(Country::class, 'iso2')],
            'phone' => ['nullable', 'phone', 'max:255'],
            'gender' => ['nullable', 'in:male,female', 'string'],

            'taxId' => ['required', 'string', 'max:255'],
            'workPosition' => ['required', 'string', 'max:255'],
            'workOrganization' => ['required', 'string', 'max:255'],

            'avatarFile' => ['nullable', 'file', 'mimes:jpeg,png', 'max:5120'],

            'roles' => ['nullable', 'array'],
            'roles.*' => ['nullable'],

            'blockedAt' => ['nullable', Rule::date()->afterOrEqual(now()->subtract(10, 'minutes'))],
            'activeAt' => ['nullable', Rule::date()->afterOrEqual(now()->subtract(10, 'minutes'))],
            'approvedAt' => ['nullable', Rule::date()->afterOrEqual(now()->subtract(10, 'minutes'))],
            'password' => ['nullable', Password::min(6)->mixedCase()->numbers()->symbols(), 'confirmed'],
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
            'firstName' => 'prenume',
            'lastName' => 'nume',
            'email' => 'email',
            'birthdate' => 'data nașterii',
            'countryCode' => 'codul țării',
            'phone' => 'telefon',
            'gender' => 'sex',
            'taxId' => 'idnp',
            'workPosition' => 'funcția',
            'workOrganization' => 'entitatea',
            'activeAt' => 'data aderării',
            'approvedAt' => 'data aprobării',
            'roles' => 'roluri',
            'roles.*' => 'rolul',
            'password_conditions' => 'confirmarea parolei',
            'consentPersonalDataProcessing' => 'politica GDPR',
            'blockedAt' => 'data blocării',
        ];
    }
}
