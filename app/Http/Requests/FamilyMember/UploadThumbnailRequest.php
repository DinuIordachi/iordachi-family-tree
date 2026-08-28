<?php

namespace App\Http\Requests\FamilyMember;

use App\Enums\PermissionsEnum;
use Illuminate\Support\Facades\Gate;
use App\Http\Requests\BaseFormRequest;
use App\Models\FamilyMember;

class UploadThumbnailRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return Gate::allows(PermissionsEnum::UPDATE->value, $this->route('family_member'));
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'mimetypes:' . implode(',', FamilyMember::ALLOWED_THUMBNAIL_MIMES),
            ],
        ];
    }
}
