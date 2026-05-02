<?php

namespace App\Http\Resources\Contact;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class ContactResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Contact
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
            'type' => $this->resource->type,
            'value' => $this->resource->value,
            'favorite' => $this->resource->favorite,
            'whatsapp' => $this->resource->whatsapp,
            'viber' => $this->resource->viber,
            'telegram' => $this->resource->telegram,
            'calls' => $this->resource->calls,
            'sms' => $this->resource->sms,
        ];
    }
}
