<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\Person;
use App\Models\Contact;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use App\Services\ContactService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Contact\ContactResource;
use App\Http\Requests\Contact\StoreContactRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Http\Requests\Contact\DeleteContactRequest;
use Illuminate\Validation\ValidationException;

class ContactController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly ContactService $contactService)
    {

    }

    /**
     * Create a contact for a person
     *
     * @param StoreContactRequest $request
     * @param Person              $person
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreContactRequest $request, Person $person): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $person) {
                $data = $request->only([
                    'type', 'value', 'favorite',
                    'whatsapp', 'viber', 'telegram',
                    'calls', 'sms',
                ]);
                $data['person_id'] = $person->id;

                $contact = $this->contactService->create($data);

                if (! $contact) {
                    throw new Exception('Failed to create the contact');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($contact)
                    ->event(PermissionsEnum::CONTACT_CREATE->value)
                    ->log('Contact was created by :causer.email');

                return ContactResource::make($contact)
                    ->message('Contact was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Contact] Failed to create the contact. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the contact. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update a contact
     *
     * @param UpdateContactRequest $request
     * @param Person               $person
     * @param Contact              $contact
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateContactRequest $request, Person $person, Contact $contact): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $contact) {
                $data = $request->only([
                    'type', 'value', 'favorite',
                    'whatsapp', 'viber', 'telegram',
                    'calls', 'sms',
                ]);

                $response = $this->contactService->update($contact, $data);

                if (! $response) {
                    throw new Exception('Failed to update the contact');
                }

                $contact->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($contact)
                    ->event(PermissionsEnum::CONTACT_UPDATE->value)
                    ->log('Contact was updated by :causer.email');

                return ContactResource::make($contact)
                    ->message('Contact was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Contact] Failed to update the contact. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the contact. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a contact
     *
     * @param DeleteContactRequest $request
     * @param Person               $person
     * @param Contact              $contact
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteContactRequest $request, Person $person, Contact $contact): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $contact) {
                $response = $this->contactService->delete($contact);

                if (! $response) {
                    throw new Exception('Failed to delete the contact');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($contact)
                    ->event(PermissionsEnum::CONTACT_DELETE->value)
                    ->log('Contact was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Contact was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Contact] Failed to delete the contact. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the contact. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
