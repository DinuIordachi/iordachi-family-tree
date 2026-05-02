<?php

namespace App\Http\Resources\Role;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\User\LimitedUserResource;
use App\Http\Resources\Permission\LimitedPermissionResource;

class RoleResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Role
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
            'name' => $this->resource->name,
            'displayName' => $this->resource->display_name,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'users' => LimitedUserResource::collection($this->whenLoaded('users')),
            'permissions' => LimitedPermissionResource::collection($this->whenLoaded('permissions')),
            'can' => [
                'view' => $request->user()->can('view', $this->resource),
                'update' => $request->user()->can('update', $this->resource),
                'delete' => $request->user()->can('delete', $this->resource),
            ],
        ];
    }
}
