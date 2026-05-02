<?php

namespace App\Http\Resources\Activity;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\User\UserResource;
use App\Http\Resources\User\LimitedUserResource;

class ActivityResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Activity
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
            'logName' => $this->resource->log_name,
            'event' => $this->resource->event,
            'description' => $this->resource->description,
            'causer' => $this->resource->causer_id && $this->resource->causer_type === User::class
                ? LimitedUserResource::make($this->resource->causer)
                : null,
            'properties' => $this->resource->properties,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'can' => [
                'view' => $request->user()->can('view', $this->resource),
                'update' => false,
                'delete' => $request->user()->can('delete', $this->resource),
            ],
        ];
    }
}
