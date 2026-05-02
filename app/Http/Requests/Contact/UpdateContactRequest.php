<?php

namespace App\Http\Requests\Contact;

use App\Enums\ContactTypeEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class UpdateContactRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('update', $this->contact);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(ContactTypeEnum::values())],
            'value' => ['required', 'string', 'max:255'],
            'favorite' => ['boolean'],
            'whatsapp' => ['boolean'],
            'viber' => ['boolean'],
            'telegram' => ['boolean'],
            'calls' => ['boolean'],
            'sms' => ['boolean'],
        ];
    }
}
