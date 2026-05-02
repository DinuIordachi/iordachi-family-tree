<?php

namespace App\Http\Requests\Setting;

use App\Models\SupportFaq;
use App\Models\SupportType;
use App\Enums\PermissionsEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class UpdateSettingRequest extends BaseFormRequest
{
    protected bool $parseToSnakeCase = false;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::SETTINGS_UPDATE);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            /**
             * Contact Us Settings
             */
            "contactUs" => ['nullable', 'array'],
            "contactUs.emails" => ['nullable', 'array'],
            "contactUs.emails.*" => ['nullable', 'string'],
            "contactUs.address" => ['nullable', 'string'],
            "contactUs.responseTime" => ['nullable', 'string'],
            "contactUs.facebookUsername" => ['nullable', 'string'],
            "contactUs.instagramUsername" => ['nullable', 'string'],
            "contactUs.linkedInUsername" => ['nullable', 'string'],
            "contactUs.tiktokUsername" => ['nullable', 'string'],
            "contactUs.twitterUsername" => ['nullable', 'string'],

            /**
             * Legal Settings
             */
            "legal" => ['nullable', 'array'],
            "legal.personalDataProcessing" => ['nullable', 'string'],
            "legal.privacyPolicy" => ['nullable', 'string'],
            "legal.regulations" => ['nullable', 'string'],
            "legal.termAndConditions" => ['nullable', 'string'],

            /**
             * Bank Settings
             */
            "bank" => ['nullable', 'array'],
            "bank.beneficiaryName" => ['nullable', 'string'],
            "bank.idno" => ['nullable', 'string'],
            "bank.bankName" => ['nullable', 'string'],
            "bank.fiscalCode" => ['nullable', 'string'],
            "bank.account" => ['nullable', 'string'],
            "bank.iban" => ['nullable', 'string'],
            "bank.membershipFeeAmount" => ['nullable', 'integer', 'min:0'],
            "bank.currency" => ['nullable', 'string', 'max:10'],
            "bank.paymentInstructionsRo" => ['nullable', 'string'],

            /**
             * Registration Settings
             */
            "registration" => ['nullable', 'array'],
            "registration.startDate" => ['nullable', 'date'],
            "registration.endDate" => ['nullable', 'date'],
        ];
    }
}
