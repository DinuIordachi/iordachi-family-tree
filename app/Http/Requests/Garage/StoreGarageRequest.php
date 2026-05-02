<?php

namespace App\Http\Requests\Garage;

use App\Models\Garage;
use App\Enums\GarageStatusEnum;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class StoreGarageRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('create', Garage::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'associationId' => ['required', 'integer', Rule::exists('associations', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(GarageStatusEnum::values())],
            'city' => ['required', 'string', 'max:255'],
            'street' => ['required', 'string', 'max:255'],
            'internalAddress' => ['nullable', 'string', 'max:255'],
            'addressNumber' => ['nullable', 'string', 'max:50'],
            'cadastralNumber' => ['required', 'string', 'max:255'],
            'area' => ['required', 'numeric', 'min:0'],
        ];
    }
}
