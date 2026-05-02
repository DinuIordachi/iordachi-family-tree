<?php

namespace App\Http\Resources\World;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class CountryResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Country
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
            'iso2' => $this->resource->iso2,
            'name' => $this->resource->name,
            'phoneCode' => $this->resource->phone_code,
            'region' => $this->resource->region,
            'subregion' => $this->resource->subregion,
            'emoji' => $this->resource->emoji,
            'emojiU' => $this->resource->emojiU,
            'flagUrl' => $this->resource->getFlagUrl('24x18'),
        ];
    }
}
