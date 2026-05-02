<?php

namespace App\Http\Resources\AssociationPersonRole;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Person\LimitedPersonResource;
use App\Http\Resources\DomainRole\DomainRoleResource;
use App\Http\Resources\Association\LimitedAssociationResource;

class AssociationPersonRoleResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\AssociationPersonRole
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
            'roleId' => $this->resource->role_id,
            'personId' => $this->resource->person_id,
            'startDate' => $this->resource->start_date,
            'endDate' => $this->resource->end_date,
            'isActive' => $this->resource->is_active,
            'createdAt' => $this->resource->created_at,
            'association' => LimitedAssociationResource::make($this->whenLoaded('association')),
            'role' => DomainRoleResource::make($this->whenLoaded('role')),
            'person' => LimitedPersonResource::make($this->whenLoaded('person')),
        ];
    }
}
