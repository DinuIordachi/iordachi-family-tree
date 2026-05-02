<?php

namespace App\Http\Resources\DomainRole;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class DomainRoleResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\DomainRole
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
            'scope' => $this->resource->scope,
        ];
    }
}
