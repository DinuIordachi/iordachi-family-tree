<?php

namespace App\Http\Resources\Permission;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class PermissionResource extends EmptyJsonResource
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
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'can' => [
                'view' => $request->user()->can('view', $this->resource),
                'update' => $request->user()->can('update', $this->resource),
                'delete' => $request->user()->can('delete', $this->resource),
            ],
        ];
    }
}
