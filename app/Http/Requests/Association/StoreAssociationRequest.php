<?php

namespace App\Http\Requests\Association;

use App\Models\Association;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class StoreAssociationRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('create', Association::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'cadastralNumbers' => ['nullable', 'array'],
            'cadastralNumbers.*' => ['string'],
        ];
    }
}
