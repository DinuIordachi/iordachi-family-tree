<?php

namespace App\Http\Resources\Garage;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Association\LimitedAssociationResource;
use App\Http\Resources\GaragePersonRole\GaragePersonRoleResource;

class GarageResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Garage
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
            'associationId' => $this->resource->association_id,
            'name' => $this->resource->name,
            'status' => $this->resource->status,
            'city' => $this->resource->city,
            'street' => $this->resource->street,
            'internalAddress' => $this->resource->internal_address,
            'addressNumber' => $this->resource->address_number,
            'cadastralNumber' => $this->resource->cadastral_number,
            'area' => $this->resource->area,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'association' => LimitedAssociationResource::make($this->whenLoaded('association')),
            'personRoles' => GaragePersonRoleResource::collection($this->whenLoaded('personRoles')),
        ];
    }
}
