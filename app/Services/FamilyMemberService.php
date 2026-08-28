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
