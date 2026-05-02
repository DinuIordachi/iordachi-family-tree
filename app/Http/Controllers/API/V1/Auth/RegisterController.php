<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use Exception;
use App\Enums\RolesEnum;
use App\Services\UserService;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Services\VerifyEmailService;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\RegisterResource;
use Illuminate\Validation\ValidationException;

#[Group('Authentication')]
class RegisterController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly UserService $userService,
        protected readonly VerifyEmailService $verifyEmailService,
    ) {
    }

    /**
     * Register a new user.
     *
     * @unauthenticated
     *
     * @throws Throwable
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->collect()->only(['first_name', 'last_name', 'email', 'password'])->toArray();
                $data['password'] = Hash::make($data['password']);

                $user = $this->userService->create($data);
                if (! $user) {
                    throw new Exception('Failed to register the user');
                }

                if ($user->roles()->doesntExist()) {
                    $this->userService->setRoles($user, RolesEnum::MEMBER->value);
                }

                $this->verifyEmailService->sendEmailCodeNotification($user);

                $user->refresh();

                return RegisterResource::make($user)
                    ->message('User registered successfully. A verification code has been sent to your email.')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to register. Error: ' . $throwable->getMessage(), $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to register. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR,
                );
            },
        );
    }
}
