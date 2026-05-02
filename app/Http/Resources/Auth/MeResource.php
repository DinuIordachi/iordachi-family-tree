<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\World\CountryResource;
use App\Http\Resources\Role\LimitedRoleResource;
use App\Http\Resources\Permission\LimitedPermissionResource;

class MeResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\User
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $properties = collect($this->resource->properties ?? []);

        return [
            'id' => $this->resource->id,
            'firstName' => $this->resource->first_name,
            'lastName' => $this->resource->last_name,
            'email' => $this->resource->email,
            'gender' => $this->resource->gender,
            'birthdate' => $this->resource->birthdate,
            'phone' => $this->when(
                $this->resource->phone,
                fn () => phone($this->resource->phone)->formatInternational(),
                null,
            ),
            'avatarUrl' => $this->resource->avatar_url,
            'enrollmentProofUrl' => $this->resource->enrollment_proof_url,
            'taxId' => $properties->get('taxId'),
            'workPosition' => $properties->get('workPosition'),
            'workOrganization' => $properties->get('workOrganization'),
            'emailVerified' => $this->resource->hasVerifiedEmail(),
            'registered' => $this->resource->isRegistered(),
            'active' => $this->resource->isActive(),
            'approved' => $this->resource->isApproved(),
            'country' => $this->resource->country_id ? CountryResource::make($this->resource->country) : null,
            'emailVerifiedAt' => $this->resource->email_verified_at,
            'registeredAt' => $this->resource->registered_at,
            'activeAt' => $this->resource->active_at,
            'approvedAt' => $this->resource->approved_at,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'roles' => LimitedRoleResource::collection($this->resource->roles),
            'permissions' => LimitedPermissionResource::collection($this->resource->getAllPermissions()),
        ];
    }
}
