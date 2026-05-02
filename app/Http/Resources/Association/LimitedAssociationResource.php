<?php

namespace App\Http\Resources\Association;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class LimitedAssociationResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Association
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
        ];
    }
}
