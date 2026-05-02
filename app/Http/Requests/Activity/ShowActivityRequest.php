<?php

namespace App\Http\Requests\Activity;

use App\Enums\PermissionsEnum;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class ShowActivityRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::VIEW->value, $this->activity);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            //
        ];
    }
}
