<?php

namespace App\Http\Requests\AssociationPersonRole;

use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class UpdateAssociationPersonRoleRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('update', $this->association);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'endDate' => ['nullable', 'date'],
            'isActive' => ['boolean'],
        ];
    }
}
