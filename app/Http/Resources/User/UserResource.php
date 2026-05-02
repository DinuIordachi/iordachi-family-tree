<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use App\Enums\PermissionsEnum;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\World\CountryResource;
use App\Http\Resources\Role\LimitedRoleResource;

class UserResource extends EmptyJsonResource
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
            'emailVerified' => $this->resource->hasVerifiedEmail(),
            'emailCode' => $this->when(
                $this->resource->email_code && $this->resource->email_code_expires_at,
                [
                    'code' => $this->resource->email_code,
                    'expiresAt' => $this->resource->email_code_expires_at,
                ],
                null
            ),
            'taxId' => $properties->get('taxId'),
            'workPosition' => $properties->get('workPosition'),
            'workOrganization' => $properties->get('workOrganization'),
            'consentPersonalDataProcessing' => $properties->get('consentPersonalDataProcessing'),
            'blocked' => $this->resource->isBlocked(),
            'registered' => $this->resource->isRegistered(),
            'active' => $this->resource->isActive(),
            'approved' => $this->resource->isApproved(),
            'registeredAt' => $this->resource->registered_at,
            'blockedAt' => $this->resource->blocked_at,
            'active_at' => $this->resource->active_at,
            'approved_at' => $this->resource->approved_at,
            'emailVerifiedAt' => $this->resource->email_verified_at,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'deletedAt' => $this->resource->deleted_at,
            'country' => $this->resource->country_id ? CountryResource::make($this->resource->country) : null,
            'roles' => LimitedRoleResource::collection($this->resource->roles),
//            'permissions' => LimitedPermissionResource::collection(
//                $this->whenLoaded('permissions', $this->resource->getAllPermissions())
//            ),
            'can' => [
                'view' => $request->user()->can(PermissionsEnum::VIEW, $this->resource),
                'update' => $request->user()->can(PermissionsEnum::UPDATE, $this->resource),
                'delete' => $request->user()->can(PermissionsEnum::DELETE, $this->resource),
                'forceDelete' => $request->user()->can(PermissionsEnum::FORCE_DELETE, $this->resource),
            ],
        ];
    }
}
