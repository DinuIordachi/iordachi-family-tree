<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\Person;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use App\Services\PersonService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Person\PersonResource;
use App\Http\Requests\Person\ListPersonRequest;
use App\Http\Requests\Person\ShowPersonRequest;
use App\Http\Requests\Person\StorePersonRequest;
use App\Http\Requests\Person\UpdatePersonRequest;
use App\Http\Requests\Person\DeletePersonRequest;
use Illuminate\Validation\ValidationException;

class PersonController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly PersonService $personService)
    {

    }

    /**
     * List persons
     *
     * @param ListPersonRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListPersonRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->personService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([])->toArray(),
        );

        $records = $records->paginate($data->get('page_size', 20));

        return PersonResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a person
     *
     * @param ShowPersonRequest $request
     * @param Person            $person
     *
     * @return JsonResponse
     */
    public function show(ShowPersonRequest $request, Person $person): JsonResponse
    {
        $person->load([
            'contacts',
            'garageRoles.role',
            'garageRoles.garage',
            'associationRoles.role',
            'associationRoles.association',
        ]);

        return PersonResource::make($person)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a person
     *
     * @param StorePersonRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StorePersonRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->only([
                    'first_name', 'last_name', 'patronymic',
                ]);

                $person = $this->personService->create($data);

                if (! $person) {
                    throw new Exception('Failed to create the person');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($person)
                    ->event(PermissionsEnum::PERSON_CREATE->value)
                    ->log('Person :subject.name_id was created by :causer.email');

                return PersonResource::make($person)
                    ->message('Person was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Person] Failed to create the person. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the person. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update a person
     *
     * @param UpdatePersonRequest $request
     * @param Person              $person
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdatePersonRequest $request, Person $person): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $person) {
                $data = $request->only([
                    'first_name', 'last_name', 'patronymic',
                ]);

                $response = $this->personService->update($person, $data);

                if (! $response) {
                    throw new Exception('Failed to update the person');
                }

                $person->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($person)
                    ->event(PermissionsEnum::PERSON_UPDATE->value)
                    ->log('Person :subject.name_id was updated by :causer.email');

                return PersonResource::make($person)
                    ->message('Person was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Person] Failed to update the person. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the person. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a person
     *
     * @param DeletePersonRequest $request
     * @param Person              $person
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeletePersonRequest $request, Person $person): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $person) {
                $response = $this->personService->delete($person);

                if (! $response) {
                    throw new Exception('Failed to delete the person');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($person)
                    ->event(PermissionsEnum::PERSON_DELETE->value)
                    ->log('Person :subject.name_id was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Person was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Person] Failed to delete the person. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the person. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
