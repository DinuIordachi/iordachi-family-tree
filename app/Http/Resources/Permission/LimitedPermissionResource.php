<?php

namespace App\Http\Resources\Permission;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class LimitedPermissionResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Permission
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
        ];
    }
}
