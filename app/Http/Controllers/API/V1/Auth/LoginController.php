<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use App\Services\AuthService;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Services\VerifyEmailService;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Auth\LoginResource;
use Illuminate\Validation\ValidationException;

#[Group('Authentication')]
class LoginController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly AuthService $authService,
        protected readonly VerifyEmailService $verifyEmailService
    ) {

    }

    /**
     * Log in a user
     *
     * @unauthenticated
     *
     * @param \App\Http\Requests\Auth\LoginRequest $request
     *
     * @return \Illuminate\Http\JsonResponse
     * @throws \Throwable
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->collect();
                $accessToken = $this->authService->attempt(
                    $data->get('email'),
                    $data->get('password'),
                    boolval($data->get('remember')),
                );

                $user = $accessToken->accessToken->tokenable()->first();

                if ($user && ! $this->verifyEmailService->isEmailVerified($user)) {
                    $this->verifyEmailService->sendEmailCodeNotification($user);
                }

                activity()
                    ->causedBy($user)
                    ->performedOn($accessToken->accessToken)
                    ->event('login')
                    ->withProperty('remember', $request->boolean('remember'))
                    ->log("User :causer.email logged in a new session #:subject.id");

                return LoginResource::make($accessToken)
                    ->message('User logged in successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to login. Error: ' . $throwable->getMessage(), $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to login. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
