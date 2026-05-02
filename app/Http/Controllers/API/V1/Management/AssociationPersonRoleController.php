<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\Association;
use App\Models\AssociationPersonRole;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Services\AssociationPersonRoleService;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\AssociationPersonRole\AssociationPersonRoleResource;
use App\Http\Requests\AssociationPersonRole\StoreAssociationPersonRoleRequest;
use App\Http\Requests\AssociationPersonRole\UpdateAssociationPersonRoleRequest;
use App\Http\Requests\AssociationPersonRole\DeleteAssociationPersonRoleRequest;
use Illuminate\Validation\ValidationException;

class AssociationPersonRoleController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly AssociationPersonRoleService $associationPersonRoleService)
    {

    }

    /**
     * Assign a person role to an association
     *
     * @param StoreAssociationPersonRoleRequest $request
     * @param Association                       $association
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreAssociationPersonRoleRequest $request, Association $association): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $association) {
                $data = $request->only([
                    'role_id', 'person_id', 'start_date', 'end_date', 'is_active',
                ]);
                $data['association_id'] = $association->id;

                $associationPersonRole = $this->associationPersonRoleService->create($data);

                if (! $associationPersonRole) {
                    throw new Exception('Failed to assign the person role to the association');
                }

                $associationPersonRole->load(['role', 'person']);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($associationPersonRole)
                    ->event(PermissionsEnum::ASSOCIATION_UPDATE->value)
                    ->log('Person role was assigned to association by :causer.email');

                return AssociationPersonRoleResource::make($associationPersonRole)
                    ->message('Person role was assigned successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[AssociationPersonRole] Failed to assign person role. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to assign the person role. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update a person role assignment
     *
     * @param UpdateAssociationPersonRoleRequest $request
     * @param Association                        $association
     * @param AssociationPersonRole              $associationPersonRole
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateAssociationPersonRoleRequest $request, Association $association, AssociationPersonRole $associationPersonRole): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $associationPersonRole) {
                $data = $request->only([
                    'end_date', 'is_active',
                ]);

                $response = $this->associationPersonRoleService->update($associationPersonRole, $data);

                if (! $response) {
                    throw new Exception('Failed to update the person role assignment');
                }

                $associationPersonRole->refresh();
                $associationPersonRole->load(['role', 'person']);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($associationPersonRole)
                    ->event(PermissionsEnum::ASSOCIATION_UPDATE->value)
                    ->log('Person role assignment was updated by :causer.email');

                return AssociationPersonRoleResource::make($associationPersonRole)
                    ->message('Person role assignment was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[AssociationPersonRole] Failed to update person role assignment. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the person role assignment. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Remove a person role from an association
     *
     * @param DeleteAssociationPersonRoleRequest $request
     * @param Association                        $association
     * @param AssociationPersonRole              $associationPersonRole
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteAssociationPersonRoleRequest $request, Association $association, AssociationPersonRole $associationPersonRole): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $associationPersonRole) {
                $response = $this->associationPersonRoleService->delete($associationPersonRole);

                if (! $response) {
                    throw new Exception('Failed to remove the person role from the association');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($associationPersonRole)
                    ->event(PermissionsEnum::ASSOCIATION_UPDATE->value)
                    ->log('Person role was removed from association by :causer.email');

                return EmptyJsonResource::messageResponse('Person role was removed successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[AssociationPersonRole] Failed to remove person role. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to remove the person role. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
