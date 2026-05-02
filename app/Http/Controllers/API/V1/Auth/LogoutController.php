<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use App\Services\AuthService;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Requests\Auth\LogoutRequest;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Auth\LogoutResource;
use Illuminate\Validation\ValidationException;

#[Group('Authentication')]
class LogoutController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly AuthService $authService)
    {

    }

    /**
     * Log out a user
     *
     * @param \App\Http\Requests\Auth\LogoutRequest $request
     *
     * @return \Illuminate\Http\JsonResponse
     * @throws \Throwable
     */
    public function __invoke(LogoutRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $authUser = $request->user('api');

                $this->authService->logout($authUser);

                activity()
                    ->causedBy($authUser)
                    ->event('logout')
                    ->log("User :causer.email logged out from session #:subject.id");

                return LogoutResource::make()
                    ->message('User logged out successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to logout. Error: ' . $throwable->getMessage(), $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to logout. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
