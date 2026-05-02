<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Role\LimitedRoleResource;
use App\Http\Resources\Permission\LimitedPermissionResource;

class MeResource extends EmptyJsonResource
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
            'emailVerifiedAt' => $this->resource->email_verified_at,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'roles' => LimitedRoleResource::collection($this->resource->roles),
            'permissions' => LimitedPermissionResource::collection($this->resource->getAllPermissions()),
        ];
    }
}
