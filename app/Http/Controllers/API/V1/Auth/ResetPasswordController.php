<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use Illuminate\Http\Response;
use App\Services\UserService;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use App\Services\ResetPasswordService;
use App\Http\Resources\EmptyJsonResource;
use Illuminate\Validation\ValidationException;
use App\Http\Requests\Auth\ResetPasswordRequest;

#[Group('Reset Password')]
class ResetPasswordController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly AuthService $authService,
        protected readonly UserService $userService,
        protected readonly ResetPasswordService $resetPasswordService
    ) {

    }

    /**
     * Reset password
     *
     * @unauthenticated
     *
     * @param ResetPasswordRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                /* @ignoreParam */
                $code = $request->get('code');
                /* @ignoreParam */
                $password = $request->get('password');
                $user = $this->userService->findByEmailCode($code);

                if (! $user) {
                    throw ValidationException::withMessages([
                        'code' => 'Invalid verification code. Please try again with a different one',
                    ]);
                }

                if ($this->authService->checkPassword($user, $password)) {
                    throw ValidationException::withMessages([
                        'password' => 'New password cannot be the same as the old password. Please try again with a different password',
                    ]);
                }

                $this->resetPasswordService->resetPassword($user, $password);
                $this->authService->logoutAll($user);
                $this->resetPasswordService->sendResetPasswordNotification($user);

                activity()
                    ->causedByAnonymous()
                    ->performedOn($user)
                    ->event('reset-password')
                    ->withProperty('code', $code)
                    ->log(
                        "A person updated the user's :subject.email password with code :properties:code." .
                        "User :subject.email was logged out from all sessions"
                    );

                return EmptyJsonResource::messageResponse('Your password has been reset successfully. Please login with your new password.');
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to reset the password. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to reset the password. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
