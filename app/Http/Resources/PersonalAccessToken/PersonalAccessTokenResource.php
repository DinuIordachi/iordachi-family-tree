<?php

namespace App\Http\Resources\PersonalAccessToken;

use Illuminate\Http\Request;
use App\Enums\PermissionsEnum;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\User\UserResource;
use App\Http\Resources\User\LimitedUserResource;

class PersonalAccessTokenResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\PersonalAccessToken
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'userAgent' => $this->resource->user_agent,
            'issued' => [
                'ip' => $this->resource->issued_ip,
                'countryCode' => $this->resource->issued_country_code,
                'country' => $this->resource->issued_country,
            ],
            'last' => [
                'ip' => $this->resource->last_ip,
                'countryCode' => $this->resource->last_country_code,
                'country' => $this->resource->last_country,
                'usedAt' => $this->resource->last_used_at,
            ],
            'user' => $this->when(
                $this->resource->tokenable()->exists(),
                LimitedUserResource::make($this->resource->tokenable),
                null
            ),
            'expiresAt' => $this->resource->expires_at,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'deletedAt' => $this->resource->deleted_at,
            'can' => [
                'view' => $request->user()->can(PermissionsEnum::VIEW, $this->resource),
                'update' => $request->user()->can(PermissionsEnum::UPDATE, $this->resource),
                'delete' => $request->user()->can(PermissionsEnum::DELETE, $this->resource),
                'forceDelete' => $request->user()->can(PermissionsEnum::FORCE_DELETE, $this->resource),
            ],
        ];
    }
}
