<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use App\Enums\PermissionsEnum;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Role\LimitedRoleResource;

class UserResource extends EmptyJsonResource
{
    /**
     * @var \App\Models\User
     */
    public $resource;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'firstName' => $this->resource->first_name,
            'lastName' => $this->resource->last_name,
            'email' => $this->resource->email,
            'avatarUrl' => $this->resource->avatar_url,
            'emailVerified' => $this->resource->hasVerifiedEmail(),
            'blocked' => $this->resource->isBlocked(),
            'blockedAt' => $this->resource->blocked_at,
            'emailVerifiedAt' => $this->resource->email_verified_at,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'deletedAt' => $this->resource->deleted_at,
            'roles' => LimitedRoleResource::collection($this->resource->roles),
            'can' => [
                'view' => $request->user()->can(PermissionsEnum::VIEW, $this->resource),
                'update' => $request->user()->can(PermissionsEnum::UPDATE, $this->resource),
                'delete' => $request->user()->can(PermissionsEnum::DELETE, $this->resource),
                'forceDelete' => $request->user()->can(PermissionsEnum::FORCE_DELETE, $this->resource),
            ],
        ];
    }
}
