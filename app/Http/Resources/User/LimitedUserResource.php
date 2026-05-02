<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\World\CountryResource;
use App\Http\Resources\Role\LimitedRoleResource;

class LimitedUserResource extends EmptyJsonResource
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
            'blocked' => $this->resource->isBlocked(),
            'country' => $this->resource->country_id ? CountryResource::make($this->resource->country) : null,
            'roles' => LimitedRoleResource::collection($this->whenLoaded('roles')),
        ];
    }
}
