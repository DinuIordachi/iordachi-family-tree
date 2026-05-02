<?php

namespace App\Http\Resources\Person;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class LimitedPersonResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Person
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
            'nameId' => $this->resource->name_id,
        ];
    }
}
