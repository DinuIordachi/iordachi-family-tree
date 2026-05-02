<?php

namespace App\Http\Resources\GaragePersonRole;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Garage\LimitedGarageResource;
use App\Http\Resources\Person\LimitedPersonResource;
use App\Http\Resources\DomainRole\DomainRoleResource;

class GaragePersonRoleResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\GaragePersonRole
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
            'garageId' => $this->resource->garage_id,
            'roleId' => $this->resource->role_id,
            'personId' => $this->resource->person_id,
            'ownershipPercentage' => $this->resource->ownership_percentage,
            'createdAt' => $this->resource->created_at,
            'garage' => LimitedGarageResource::make($this->whenLoaded('garage')),
            'role' => DomainRoleResource::make($this->whenLoaded('role')),
            'person' => LimitedPersonResource::make($this->whenLoaded('person')),
        ];
    }
}
