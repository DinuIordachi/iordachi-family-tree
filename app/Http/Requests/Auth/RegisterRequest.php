<?php

namespace App\Http\Requests\Auth;

use Throwable;
use App\Models\Country;
use Illuminate\Http\Response;
use App\Services\UserService;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use Illuminate\Validation\ValidationException;

class RegisterRequest extends BaseFormRequest
{
    /* @var array */
    protected array $parseToSnakeCaseIgnoreFields = [
        'taxId',
        'workPosition',
        'workOrganization',
        'consentPersonalDataProcessing',
    ];

    /**
     * Determine if the user is authorized to make this request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authorize(): bool|\Illuminate\Auth\Access\Response
    {
        return auth()->check() === false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $this->merge([
            'consentPersonalDataProcessing' => $this->has('consentPersonalDataProcessing')
                ? filter_var($this->input('consentPersonalDataProcessing'), FILTER_VALIDATE_BOOLEAN)
                : false,
        ]);

        return [
            'firstName' => ['required', 'string', 'max:255'],
            'lastName' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255',
            ],
            'birthdate' => ['required', 'date', Rule::date()->beforeOrEqual(now()->subYears(18))],
            /* Country Iso2 Code. Ex:MD or RO */
            'countryCode' => ['required', 'string', 'max:255', Rule::exists(Country::class, 'iso2')],
            'phone' => ['required', 'phone', 'max:255'],
            'gender' => ['nullable', 'in:male,female', 'string'],

            'taxId' => ['required', 'string', 'max:255'],
            'workPosition' => ['required', 'string', 'max:255'],
            'workOrganization' => ['required', 'string', 'max:255'],

            'activeAt' => ['required', Rule::date()],
            'signature' => ['required', 'string'],

            /* Consent of data processing. Must be true or 1 or yes or on */
            'consentPersonalDataProcessing' => ['accepted'],
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
            'signature' => 'semnătura',
            'approvedAt' => 'data aprobării',
            'roles' => 'roluri',
            'roles.*' => 'rolul',
            'password_conditions' => 'confirmarea parolei',
            'consentPersonalDataProcessing' => 'politica GDPR',
        ];
    }
}
