<?php

namespace App\Http\Resources\FamilyMember;

use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class FamilyMemberMediaResource extends EmptyJsonResource
{
    /**
     * @var Media
     */
    public $resource;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'fileName' => $this->resource->file_name,
            'mime' => $this->resource->mime_type,
            'size' => $this->resource->size,
            'url' => $this->resource->getFullUrl(),
            'collection' => $this->resource->collection_name,
            'createdAt' => $this->resource->created_at,
        ];
    }
}
