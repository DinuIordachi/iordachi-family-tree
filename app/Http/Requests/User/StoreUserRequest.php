<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Models\Country;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends BaseFormRequest
{
    /* @var array */
    protected array $parseToSnakeCaseIgnoreFields = [
        'tax_id',
        'work_position',
        'work_organization',
        'consentPersonalDataProcessing',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::CREATE->value, User::class);
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
                'required', 'string', 'email', 'max:255', Rule::unique(User::class, 'email'),
            ],
            'birthdate' => ['nullable', 'date'],
            /* Country Iso2 Code. Ex:MD or RO */
            'countryCode' => ['nullable', 'string', 'max:255', Rule::exists(Country::class, 'iso2')],
            'phone' => ['nullable', 'phone', 'max:255'],
            'gender' => ['nullable', 'in:male,female', 'string'],

            'tax_id' => ['required', 'string', 'max:255'],
            'work_position' => ['required', 'string', 'max:255'],
            'work_organization' => ['required', 'string', 'max:255'],

            'active_at' => ['nullable', 'string', 'max:255'],
            'approved_at' => ['nullable', 'string', 'max:255'],

            'roles' => ['nullable', 'array'],
            'roles.*' => ['nullable'],
            'password' => [
                'required',
                Password::min(6)->mixedCase()->numbers()->symbols(),
                'confirmed',
            ],
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
            'tax_id' => 'idnp',
            'work_position' => 'funcția',
            'work_organization' => 'entitatea',
            'active_at' => 'data aderării',
            'approved_at' => 'data aprobării',
            'roles' => 'roluri',
            'roles.*' => 'rolul',
            'password_conditions' => 'confirmarea parolei',
        ];
    }
}
