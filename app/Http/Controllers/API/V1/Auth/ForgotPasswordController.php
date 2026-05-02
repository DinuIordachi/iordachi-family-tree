<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use Illuminate\Http\Response;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use App\Services\ResetPasswordService;
use App\Http\Resources\EmptyJsonResource;
use Illuminate\Validation\ValidationException;
use App\Http\Requests\Auth\ForgotPasswordRequest;

#[Group('Reset Password')]
class ForgotPasswordController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly UserService $userService,
        protected readonly ResetPasswordService $resetPasswordService
    ) {

    }

    /**
     * Forgot password
     *
     * @unauthenticated
     * @operationId getMediaItem
     *
     * @param ForgotPasswordRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                /* @ignoreParam */
                $email = $request->get('email');
                $user = $this->userService->findByEmail($email);

                if (! $user) {
                    throw ValidationException::withMessages([
                        'email' => 'No account found with this email. Please try again with a different email',
                    ]);
                }

                $this->resetPasswordService->sendEmailCodeNotification($user);

                activity()
                    ->causedByAnonymous()
                    ->performedOn($user)
                    ->event('reset-password')
                    ->log("A person sent a reset password verification code to :subject.email email");

                return EmptyJsonResource::messageResponse('The verification code has been sent to your email address.');
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to send the verification code to reset the password. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to send the verification code to reset the password. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
