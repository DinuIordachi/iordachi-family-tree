<?php

namespace App\Http\Resources\Garage;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class LimitedGarageResource extends EmptyJsonResource
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
            'name' => $this->resource->name,
            'status' => $this->resource->status,
            'city' => $this->resource->city,
            'addressNumber' => $this->resource->address_number,
            'cadastralNumber' => $this->resource->cadastral_number,
        ];
    }
}
