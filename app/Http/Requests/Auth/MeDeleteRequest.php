<?php

namespace App\Http\Requests\Auth;

use App\Enums\PermissionsEnum;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;

class MeDeleteRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::ACCOUNT_DELETE->value);
    }

    public function rules(): array
    {
        return [];
    }
}
