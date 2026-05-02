<?php

namespace App\Http\Resources\Association;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\AssociationPersonRole\AssociationPersonRoleResource;

class AssociationResource extends EmptyJsonResource
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
            'address' => $this->resource->address,
            'phone' => $this->resource->phone,
            'cadastralNumbers' => $this->resource->cadastral_numbers,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'garagesCount' => $this->when(isset($this->resource->garages_count), $this->resource->garages_count),
            'personRoles' => AssociationPersonRoleResource::collection($this->whenLoaded('personRoles')),
        ];
    }
}
