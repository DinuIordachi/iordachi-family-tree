<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\Garage;
use Illuminate\Http\Response;
use App\Services\GarageService;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Garage\GarageResource;
use App\Http\Requests\Garage\ListGarageRequest;
use App\Http\Requests\Garage\ShowGarageRequest;
use App\Http\Requests\Garage\StoreGarageRequest;
use App\Http\Requests\Garage\UpdateGarageRequest;
use App\Http\Requests\Garage\DeleteGarageRequest;
use Illuminate\Validation\ValidationException;

class GarageController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly GarageService $garageService)
    {

    }

    /**
     * List garages
     *
     * @param ListGarageRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListGarageRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->garageService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([])->toArray(),
        );

        $records = $records->with(['association'])->paginate($data->get('page_size', 20));

        return GarageResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a garage
     *
     * @param ShowGarageRequest $request
     * @param Garage            $garage
     *
     * @return JsonResponse
     */
    public function show(ShowGarageRequest $request, Garage $garage): JsonResponse
    {
        $garage->load(['association', 'personRoles.role', 'personRoles.person']);

        return GarageResource::make($garage)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a garage
     *
     * @param StoreGarageRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreGarageRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->only([
                    'association_id', 'name', 'status',
                    'city', 'street', 'internal_address',
                    'address_number', 'cadastral_number', 'area',
                ]);

                $garage = $this->garageService->create($data);

                if (! $garage) {
                    throw new Exception('Failed to create the garage');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($garage)
                    ->event(PermissionsEnum::GARAGE_CREATE->value)
                    ->log('Garage :subject.name was created by :causer.email');

                return GarageResource::make($garage)
                    ->message('Garage was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Garage] Failed to create the garage. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the garage. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update a garage
     *
     * @param UpdateGarageRequest $request
     * @param Garage              $garage
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateGarageRequest $request, Garage $garage): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $garage) {
                $data = $request->only([
                    'association_id', 'name', 'status',
                    'city', 'street', 'internal_address',
                    'address_number', 'cadastral_number', 'area',
                ]);

                $response = $this->garageService->update($garage, $data);

                if (! $response) {
                    throw new Exception('Failed to update the garage');
                }

                $garage->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($garage)
                    ->event(PermissionsEnum::GARAGE_UPDATE->value)
                    ->log('Garage :subject.name was updated by :causer.email');

                return GarageResource::make($garage)
                    ->message('Garage was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Garage] Failed to update the garage. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the garage. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a garage
     *
     * @param DeleteGarageRequest $request
     * @param Garage              $garage
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteGarageRequest $request, Garage $garage): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $garage) {
                $response = $this->garageService->delete($garage);

                if (! $response) {
                    throw new Exception('Failed to delete the garage');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($garage)
                    ->event(PermissionsEnum::GARAGE_DELETE->value)
                    ->log('Garage :subject.name was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Garage was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Garage] Failed to delete the garage. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the garage. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
