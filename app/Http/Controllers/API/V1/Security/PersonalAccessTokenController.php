<?php

namespace App\Http\Controllers\API\V1\Security;

use Throwable;
use Exception;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Models\PersonalAccessToken;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use App\Services\PersonalAccessTokenService;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\PersonalAccessToken\PersonalAccessTokenResource;
use App\Http\Requests\PersonalAccessToken\ListPersonalAccessTokenRequest;
use App\Http\Requests\PersonalAccessToken\ShowPersonalAccessTokenRequest;
use App\Http\Requests\PersonalAccessToken\UpdatePersonalAccessTokenRequest;
use App\Http\Requests\PersonalAccessToken\DeletePersonalAccessTokenRequest;
use App\Http\Requests\PersonalAccessToken\ForceDeletePersonalAccessTokenRequest;

class PersonalAccessTokenController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly PersonalAccessTokenService $personalAccessTokenService)
    {

    }

    /**
     * List personal access tokens
     *
     * @param ListPersonalAccessTokenRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListPersonalAccessTokenRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->personalAccessTokenService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only(['user_agent', 'last_ip', 'issued_ip', 'expired', 'user'])->toArray(),
        )->paginate($data->get('page_size', 20));

        return PersonalAccessTokenResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a personal access token
     *
     * @param ShowPersonalAccessTokenRequest $request
     * @param PersonalAccessToken            $personalAccessToken
     *
     * @return JsonResponse
     */
    public function show(
        ShowPersonalAccessTokenRequest $request,
        PersonalAccessToken $personalAccessToken
    ): JsonResponse {
        return PersonalAccessTokenResource::make($personalAccessToken)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Update a personal access token
     *
     * @param UpdatePersonalAccessTokenRequest $request
     * @param PersonalAccessToken              $personalAccessToken
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(
        UpdatePersonalAccessTokenRequest $request,
        PersonalAccessToken $personalAccessToken
    ): JsonResponse {
        return $this->wrapInTransaction(
            function () use ($request, $personalAccessToken) {
                /* @ignoreParam */
                $data = $request->only(['expires_at']);

                $response = $this->personalAccessTokenService->update($personalAccessToken, $data);

                if (! $response) {
                    throw new Exception('Failed to update the personal access token');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($personalAccessToken)
                    ->event(PermissionsEnum::PERSONAL_ACCESS_TOKEN_UPDATE->value)
                    ->log('Personal access token #:subject.id was updated by :causer.email');

                return PersonalAccessTokenResource::make($personalAccessToken->refresh())
                    ->message('Personal access token was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[PersonalAccessToken] Failed to update the personal access token. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the personal access token. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a personal access token
     *
     * @param DeletePersonalAccessTokenRequest $request
     * @param PersonalAccessToken              $personalAccessToken
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(
        DeletePersonalAccessTokenRequest $request,
        PersonalAccessToken $personalAccessToken
    ): JsonResponse {
        return $this->wrapInTransaction(
            function () use ($request, $personalAccessToken) {
                $response = $this->personalAccessTokenService->delete($personalAccessToken);

                if (! $response) {
                    throw new Exception('Failed to delete the personal access token');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($personalAccessToken)
                    ->event(PermissionsEnum::PERSONAL_ACCESS_TOKEN_DELETE->value)
                    ->log('Personal access token #:subject.id was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Personal access token was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[PersonalAccessToken] Failed to delete the personal access token. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the personal access token. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Force delete a personal access token
     *
     * @param ForceDeletePersonalAccessTokenRequest $request
     * @param PersonalAccessToken                   $personalAccessToken
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function forceDestroy(
        ForceDeletePersonalAccessTokenRequest $request,
        PersonalAccessToken $personalAccessToken
    ): JsonResponse {
        return $this->wrapInTransaction(
            function () use ($request, $personalAccessToken) {
                $response = $this->personalAccessTokenService->forceDelete($personalAccessToken);

                if (! $response) {
                    throw new Exception('Failed to force delete the personal access token');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($personalAccessToken)
                    ->event(PermissionsEnum::PERSONAL_ACCESS_TOKEN_DELETE->value)
                    ->log('Personal access token #:subject.id was force deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Personal access token was force deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[PersonalAccessToken] Failed to force delete the personal access token. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to force delete the personal access token. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
