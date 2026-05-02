<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\BaseFormRequest;

class LoginRequest extends BaseFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
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
            'remember' => $this->has('remember')
                ? filter_var($this->input('remember'), FILTER_VALIDATE_BOOLEAN)
                : null,
        ]);

        return [
            'email' => 'required|email|exists:users,email',
            'password' => 'required|string',
            'remember' => 'nullable|boolean',
        ];
    }
}
