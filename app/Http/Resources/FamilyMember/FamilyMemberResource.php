<?php

namespace App\Http\Resources\FamilyMember;

use App\Models\FamilyMember;
use Illuminate\Http\Request;
use App\Enums\PermissionsEnum;
use App\Http\Resources\EmptyJsonResource;

/**
 * Single shape used both by family-chart (`id`, `data`, `rels`) and the
 * back-office (extra fields like `biography`, `media`, `can`, timestamps).
 * The chart library reads only what it needs and ignores the rest.
 */
class FamilyMemberResource extends EmptyJsonResource
{
    /**
     * @var FamilyMember
     */
    public $resource;

    public function toArray(Request $request): array
    {
        $thumbnail = $this->resource->thumbnail_url;
        $diedAt = $this->resource->died_at;
        $deceased = $this->resource->isDeceased();

        return [
            'id' => (string) $this->resource->id,
            'data' => array_filter([
                'first name' => $this->resource->first_name,
                'last name' => $this->resource->last_name,
                'birthday' => $this->resource->birthdate?->format('Y-m-d'),
                'gender' => $this->resource->gender,
                'avatar' => $thumbnail,
                /* `data.deceased` lets the family-chart hook mark cards
                 * without a second lookup. Only emitted when truthy so it
                 * stays absent from the JSON for living members. */
                'deceased' => $deceased ?: null,
                /* Mirrored into `data` so family-chart's read-only info
                 * panel can render them via `setFields(...)`. Pre-formatted
                 * here so the client doesn't need to reformat per render. */
                'biography' => $this->resource->biography ?: null,
                'died_at' => $diedAt?->format('F j, Y'),
            ], fn ($v) => $v !== null),
            'rels' => [
                'parents' => $this->resource->parents->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
                'spouses' => $this->resource->spouses->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
                'children' => $this->resource->children->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            ],
            'biography' => $this->resource->biography,
            'diedAt' => $diedAt?->toIso8601String(),
            'deceased' => $deceased,
            'thumbnailUrl' => $thumbnail,
            'media' => FamilyMemberMediaResource::collection(
                $this->resource->getMedia(FamilyMember::MEDIA_FILES_COLLECTION),
            ),
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'deletedAt' => $this->resource->deleted_at,
            'can' => [
                'view' => (bool) $request->user()?->can(PermissionsEnum::VIEW, $this->resource),
                'update' => (bool) $request->user()?->can(PermissionsEnum::UPDATE, $this->resource),
                'delete' => (bool) $request->user()?->can(PermissionsEnum::DELETE, $this->resource),
                'forceDelete' => (bool) $request->user()?->can(PermissionsEnum::FORCE_DELETE, $this->resource),
            ],
        ];
    }
}
