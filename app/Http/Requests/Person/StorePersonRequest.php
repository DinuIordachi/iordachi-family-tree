<?php

namespace App\Http\Requests\Person;

use App\Models\Person;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class StorePersonRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('create', Person::class);
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
            'lastName' => ['required', 'string', 'max:255'],
            'patronymic' => ['nullable', 'string', 'max:255'],
        ];
    }
}
