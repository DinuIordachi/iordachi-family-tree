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
use App\Http\Requests\FamilyMember\ListFamilyMemberRequest;
use App\Http\Requests\FamilyMember\ShowFamilyMemberRequest;
use App\Http\Requests\FamilyMember\StoreFamilyMemberRequest;
use App\Http\Requests\FamilyMember\UpdateFamilyMemberRequest;
use App\Http\Requests\FamilyMember\DeleteFamilyMemberRequest;
use App\Http\Requests\FamilyMember\ForceDeleteFamilyMemberRequest;

#[Group('Family Tree')]
class FamilyTreeController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly FamilyMemberService $familyMemberService)
    {
    }

    /**
     * List family members.
     *
     * Default returns the entire tree as an array of members in family-chart
     * compatible shape. Pass `asTree=false` to receive a paginated list.
     *
     * @unauthenticated
     */
    public function index(ListFamilyMemberRequest $request): JsonResponse
    {
        $data = $request->collect();
        $asTree = $data->get('as_tree', true);

        $repository = $this->familyMemberService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only(['first_name', 'last_name', 'gender', 'born_after', 'born_before', 'archived'])->toArray(),
        );

        if ($asTree) {
            $records = $repository->builder()
                ->with(['parents', 'children', 'spouses', 'media'])
                ->get();

            return FamilyMemberResource::collection($records)
                ->response()
                ->setStatusCode(Response::HTTP_OK);
        }

        $records = $repository->builder()
            ->with(['parents', 'children', 'spouses', 'media'])
            ->paginate($data->get('page_size', 20));

        return FamilyMemberResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a family member.
     *
     * @unauthenticated
     */
    public function show(ShowFamilyMemberRequest $request, FamilyMember $familyMember): JsonResponse
    {
        $familyMember->load(['parents', 'children', 'spouses', 'media']);

        return FamilyMemberResource::make($familyMember)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a family member.
     *
     * @throws Throwable
     */
    public function store(StoreFamilyMemberRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->collect();

                $member = $this->familyMemberService->create(
                    $data->only(['first_name', 'last_name', 'birthdate', 'died_at', 'gender', 'biography'])->toArray(),
                );

                if (! $member) {
                    throw new Exception('Failed to create the family member');
                }

                $this->familyMemberService->syncRelationships(
                    $member,
                    $data->get('parent_ids'),
                    $data->get('spouse_ids'),
                    $data->get('child_ids'),
                );

                $member->load(['parents', 'children', 'spouses', 'media']);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($member)
                    ->event(PermissionsEnum::FAMILY_MEMBER_CREATE->value)
                    ->log('Family member #:subject.id was created by :causer.email');

                return FamilyMemberResource::make($member)
                    ->message('Family member was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            fn (Throwable $t) => $this->reportFailure('create', $t),
        );
    }

    /**
     * Update a family member.
     *
     * @throws Throwable
     */
    public function update(UpdateFamilyMemberRequest $request, FamilyMember $familyMember): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember) {
                $data = $request->collect();

                $updated = $this->familyMemberService->update(
                    $familyMember,
                    $data->only(['first_name', 'last_name', 'birthdate', 'died_at', 'gender', 'biography'])->toArray(),
                );

                if (! $updated) {
                    throw new Exception('Failed to update the family member');
                }

                $this->familyMemberService->syncRelationships(
                    $familyMember,
                    $request->has('parent_ids') ? (array) $data->get('parent_ids', []) : null,
                    $request->has('spouse_ids') ? (array) $data->get('spouse_ids', []) : null,
                    $request->has('child_ids') ? (array) $data->get('child_ids', []) : null,
                );

                $familyMember->refresh()->load(['parents', 'children', 'spouses', 'media']);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($familyMember)
                    ->event(PermissionsEnum::FAMILY_MEMBER_UPDATE->value)
                    ->log('Family member #:subject.id was updated by :causer.email');

                return FamilyMemberResource::make($familyMember)
                    ->message('Family member was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            fn (Throwable $t) => $this->reportFailure('update', $t),
        );
    }

    /**
     * Soft-delete a family member.
     *
     * @throws Throwable
     */
    public function destroy(DeleteFamilyMemberRequest $request, FamilyMember $familyMember): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember) {
                if (! $this->familyMemberService->delete($familyMember)) {
                    throw new Exception('Failed to delete the family member');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($familyMember)
                    ->event(PermissionsEnum::FAMILY_MEMBER_DELETE->value)
                    ->log('Family member #:subject.id was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Family member was deleted successfully');
            },
            fn (Throwable $t) => $this->reportFailure('delete', $t),
        );
    }

    /**
     * Permanently delete a family member.
     *
     * @throws Throwable
     */
    public function forceDestroy(ForceDeleteFamilyMemberRequest $request, FamilyMember $familyMember): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $familyMember) {
                $id = $familyMember->id;

                if (! $this->familyMemberService->forceDelete($familyMember)) {
                    throw new Exception('Failed to force delete the family member');
                }

                activity()
                    ->causedBy($request->user())
                    ->event(PermissionsEnum::FAMILY_MEMBER_FORCE_DELETE->value)
                    ->log("Family member #{$id} was force deleted by :causer.email");

                return EmptyJsonResource::messageResponse('Family member was force deleted successfully');
            },
            fn (Throwable $t) => $this->reportFailure('force delete', $t),
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
