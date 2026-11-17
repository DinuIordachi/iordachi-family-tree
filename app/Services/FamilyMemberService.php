<?php

namespace App\Services;

use App\Models\FamilyMember;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use App\Repositories\FamilyMemberRepository;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @template-extends BaseRepositoryService<FamilyMemberRepository, FamilyMember>
 */
class FamilyMemberService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(FamilyMemberRepository::class);
    }

    /**
     * Reconcile parent / spouse / child links for a member.
     * `null` means leave the side untouched, `[]` clears it.
     */
    public function syncRelationships(FamilyMember $member, ?array $parentIds, ?array $spouseIds, ?array $childIds): void
    {
        $before = $this->relationshipSnapshot($member);

        DB::transaction(function () use ($member, $parentIds, $spouseIds, $childIds) {
            if ($parentIds !== null) {
                $member->parents()->sync($this->normalizeIds($parentIds, $member->id));
            }
            if ($childIds !== null) {
                $member->children()->sync($this->normalizeIds($childIds, $member->id));
            }
            if ($spouseIds !== null) {
                $member->syncSpouseIds($this->normalizeIds($spouseIds, $member->id));
            }
        });

        $after = $this->relationshipSnapshot($member);

        if ($before !== $after) {
            activity('family-member')
                ->performedOn($member)
                ->event('relationships-updated')
                ->withProperties(['old' => $before, 'attributes' => $after])
                ->log("Family member {$member->activityLabel()} relationships were updated");
        }
    }

    /**
     * Parents / spouses / children as sorted [{id, name}] lists, for the activity log.
     *
     * @return array{parents: list<array{id:int,name:string}>, spouses: list<array{id:int,name:string}>, children: list<array{id:int,name:string}>}
     */
    private function relationshipSnapshot(FamilyMember $member): array
    {
        $map = fn ($relation) => $member->{$relation}()->get()
            ->sortBy('id')
            ->map(fn (FamilyMember $m) => ['id' => $m->id, 'name' => $m->activityLabel()])
            ->values()
            ->all();

        return [
            'parents' => $map('parents'),
            'spouses' => $map('spouses'),
            'children' => $map('children'),
        ];
    }

    /**
     * Replace the member's thumbnail.
     */
    public function setThumbnail(FamilyMember $member, UploadedFile $file): Media
    {
        return $member
            ->addMedia($file)
            ->toMediaCollection(FamilyMember::MEDIA_THUMBNAIL_COLLECTION);
    }

    public function clearThumbnail(FamilyMember $member): void
    {
        $member->clearMediaCollection(FamilyMember::MEDIA_THUMBNAIL_COLLECTION);
    }

    /**
     * Append a media file to the member's gallery.
     */
    public function addMedia(FamilyMember $member, UploadedFile $file): Media
    {
        return $member
            ->addMedia($file)
            ->toMediaCollection(FamilyMember::MEDIA_FILES_COLLECTION);
    }

    public function deleteMedia(FamilyMember $member, Media $media): bool
    {
        if ($media->model_type !== FamilyMember::class || (int) $media->model_id !== $member->id) {
            return false;
        }
        $media->delete();

        return true;
    }

    /**
     * Strip self-references and dedupe ids — defensive against malformed payloads.
     */
    private function normalizeIds(array $ids, int $excludeId): array
    {
        return array_values(array_unique(array_filter(
            array_map('intval', $ids),
            fn (int $id) => $id !== $excludeId && $id > 0,
        )));
    }
}
