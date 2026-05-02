<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Role\LimitedRoleResource;

class LimitedUserResource extends EmptyJsonResource
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
            'roles' => LimitedRoleResource::collection($this->whenLoaded('roles')),
        ];
    }
}
