<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\Association;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use App\Services\AssociationService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Association\AssociationResource;
use App\Http\Requests\Association\ListAssociationRequest;
use App\Http\Requests\Association\ShowAssociationRequest;
use App\Http\Requests\Association\StoreAssociationRequest;
use App\Http\Requests\Association\UpdateAssociationRequest;
use App\Http\Requests\Association\DeleteAssociationRequest;
use Illuminate\Validation\ValidationException;

class AssociationController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly AssociationService $associationService)
    {

    }

    /**
     * List associations
     *
     * @param ListAssociationRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListAssociationRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->associationService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([])->toArray(),
        );

        $records = $records->paginate($data->get('page_size', 20));

        return AssociationResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get an association
     *
     * @param ShowAssociationRequest $request
     * @param Association            $association
     *
     * @return JsonResponse
     */
    public function show(ShowAssociationRequest $request, Association $association): JsonResponse
    {
        $association->loadCount('garages');
        $association->load(['personRoles.role', 'personRoles.person']);

        return AssociationResource::make($association)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create an association
     *
     * @param StoreAssociationRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreAssociationRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->only([
                    'name', 'address', 'phone', 'cadastral_numbers',
                ]);

                $association = $this->associationService->create($data);

                if (! $association) {
                    throw new Exception('Failed to create the association');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($association)
                    ->event(PermissionsEnum::ASSOCIATION_CREATE->value)
                    ->log('Association :subject.name was created by :causer.email');

                return AssociationResource::make($association)
                    ->message('Association was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Association] Failed to create the association. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the association. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update an association
     *
     * @param UpdateAssociationRequest $request
     * @param Association              $association
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateAssociationRequest $request, Association $association): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $association) {
                $data = $request->only([
                    'name', 'address', 'phone', 'cadastral_numbers',
                ]);

                $response = $this->associationService->update($association, $data);

                if (! $response) {
                    throw new Exception('Failed to update the association');
                }

                $association->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($association)
                    ->event(PermissionsEnum::ASSOCIATION_UPDATE->value)
                    ->log('Association :subject.name was updated by :causer.email');

                return AssociationResource::make($association)
                    ->message('Association was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Association] Failed to update the association. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the association. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete an association
     *
     * @param DeleteAssociationRequest $request
     * @param Association              $association
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteAssociationRequest $request, Association $association): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $association) {
                $response = $this->associationService->delete($association);

                if (! $response) {
                    throw new Exception('Failed to delete the association');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($association)
                    ->event(PermissionsEnum::ASSOCIATION_DELETE->value)
                    ->log('Association :subject.name was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Association was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Association] Failed to delete the association. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the association. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
