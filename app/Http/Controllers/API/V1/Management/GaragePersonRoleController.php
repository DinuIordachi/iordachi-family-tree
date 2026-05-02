<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\Garage;
use App\Models\GaragePersonRole;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Services\GaragePersonRoleService;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\GaragePersonRole\GaragePersonRoleResource;
use App\Http\Requests\GaragePersonRole\StoreGaragePersonRoleRequest;
use App\Http\Requests\GaragePersonRole\DeleteGaragePersonRoleRequest;
use Illuminate\Validation\ValidationException;

class GaragePersonRoleController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly GaragePersonRoleService $garagePersonRoleService)
    {

    }

    /**
     * Assign a person role to a garage
     *
     * @param StoreGaragePersonRoleRequest $request
     * @param Garage                       $garage
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreGaragePersonRoleRequest $request, Garage $garage): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $garage) {
                $data = $request->only([
                    'role_id', 'person_id', 'ownership_percentage',
                ]);
                $data['garage_id'] = $garage->id;

                $garagePersonRole = $this->garagePersonRoleService->create($data);

                if (! $garagePersonRole) {
                    throw new Exception('Failed to assign the person role to the garage');
                }

                $garagePersonRole->load(['role', 'person']);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($garagePersonRole)
                    ->event(PermissionsEnum::GARAGE_UPDATE->value)
                    ->log('Person role was assigned to garage by :causer.email');

                return GaragePersonRoleResource::make($garagePersonRole)
                    ->message('Person role was assigned successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[GaragePersonRole] Failed to assign person role. Error: ' . $throwable->getMessage(),
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
     * Remove a person role from a garage
     *
     * @param DeleteGaragePersonRoleRequest $request
     * @param Garage                        $garage
     * @param GaragePersonRole              $garagePersonRole
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteGaragePersonRoleRequest $request, Garage $garage, GaragePersonRole $garagePersonRole): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $garagePersonRole) {
                $response = $this->garagePersonRoleService->delete($garagePersonRole);

                if (! $response) {
                    throw new Exception('Failed to remove the person role from the garage');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($garagePersonRole)
                    ->event(PermissionsEnum::GARAGE_UPDATE->value)
                    ->log('Person role was removed from garage by :causer.email');

                return EmptyJsonResource::messageResponse('Person role was removed successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[GaragePersonRole] Failed to remove person role. Error: ' . $throwable->getMessage(),
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
