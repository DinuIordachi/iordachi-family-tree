<?php

namespace App\Http\Controllers\API\V1\FamilyTree;

use Throwable;
use Exception;
use App\Models\FamilyMember;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Services\FamilyMemberService;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Resources\EmptyJsonResource;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\FamilyMember\FamilyMemberResource;
use App\Http\Resources\FamilyMember\FamilyMemberMediaResource;
use App\Http\Requests\FamilyMember\UploadThumbnailRequest;
use App\Http\Requests\FamilyMember\UploadMediaRequest;
use App\Http\Requests\FamilyMember\DeleteMediaRequest;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

#[Group('Family Tree')]
class FamilyMemberMediaController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly FamilyMemberService $familyMemberService)
    {
    }

    /**
     * Upload (or replace) the thumbnail used as the chart card image.
     * Image mime types only.
     *
     * @throws Throwable
     */
    public function storeThumbnail(UploadThumbnailRequest $request, FamilyMember $familyMember): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember) {
                $this->familyMemberService->setThumbnail($familyMember, $request->file('file'));

                $familyMember->refresh()->load(['parents', 'children', 'spouses', 'media']);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($familyMember)
                    ->event(PermissionsEnum::FAMILY_MEMBER_UPDATE->value)
                    ->log('Thumbnail uploaded for family member #:subject.id by :causer.email');

                return FamilyMemberResource::make($familyMember)
                    ->message('Thumbnail was uploaded successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            fn (Throwable $t) => $this->reportFailure('upload thumbnail for', $t),
        );
    }

    /**
     * Remove the member's thumbnail.
     *
     * @throws Throwable
     */
    public function destroyThumbnail(UploadThumbnailRequest $request, FamilyMember $familyMember): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember) {
                $this->familyMemberService->clearThumbnail($familyMember);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($familyMember)
                    ->event(PermissionsEnum::FAMILY_MEMBER_UPDATE->value)
                    ->log('Thumbnail removed for family member #:subject.id by :causer.email');

                return EmptyJsonResource::messageResponse('Thumbnail was removed successfully');
            },
            fn (Throwable $t) => $this->reportFailure('remove thumbnail of', $t),
        );
    }

    /**
     * Append a media file (image, video, or audio) to the gallery.
     *
     * @throws Throwable
     */
    public function storeMedia(UploadMediaRequest $request, FamilyMember $familyMember): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember) {
                $media = $this->familyMemberService->addMedia($familyMember, $request->file('file'));

                activity()
                    ->causedBy($request->user())
                    ->performedOn($familyMember)
                    ->event(PermissionsEnum::FAMILY_MEMBER_UPDATE->value)
                    ->withProperty('media_id', $media->id)
                    ->log('Media uploaded for family member #:subject.id by :causer.email');

                return FamilyMemberMediaResource::make($media)
                    ->message('Media was uploaded successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            fn (Throwable $t) => $this->reportFailure('upload media for', $t),
        );
    }

    /**
     * Delete a single media file from the gallery.
     *
     * @throws Throwable
     */
    public function destroyMedia(DeleteMediaRequest $request, FamilyMember $familyMember, Media $media): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember, $media) {
                if (! $this->familyMemberService->deleteMedia($familyMember, $media)) {
                    throw new Exception('Media does not belong to this family member');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($familyMember)
                    ->event(PermissionsEnum::FAMILY_MEMBER_UPDATE->value)
                    ->withProperty('media_id', $media->id)
                    ->log('Media #:properties.media_id removed from family member #:subject.id by :causer.email');

                return EmptyJsonResource::messageResponse('Media was deleted successfully');
            },
            fn (Throwable $t) => $this->reportFailure('delete media of', $t),
        );
    }

    private function reportFailure(string $action, Throwable $throwable): JsonResponse
    {
        logger()->error("[FamilyMember] Failed to {$action} the family member. Error: " . $throwable->getMessage(), $throwable->getTrace());

        if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
            throw $throwable;
        }

        return EmptyJsonResource::messageResponse(
            "Failed to {$action} the family member. Contact our support or try again later",
            Response::HTTP_INTERNAL_SERVER_ERROR,
        );
    }
}
