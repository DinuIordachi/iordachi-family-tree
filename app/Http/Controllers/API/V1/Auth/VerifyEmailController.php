<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Services\VerifyEmailService;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Requests\Auth\VerifyEmailRequest;
use Illuminate\Validation\ValidationException;
use App\Http\Requests\Auth\ResendVerifyEmailRequest;

#[Group('Verify Email')]
class VerifyEmailController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly VerifyEmailService $verifyEmailService)
    {

    }

    /**
     * Verify email
     *
     * @param VerifyEmailRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function verify(VerifyEmailRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $user = $request->user();

                /* @ignoreParam */
                $response = $this->verifyEmailService->verifyEmailCode($user, $request->get('code'));
                if (! $response) {
                    throw ValidationException::withMessages([
                        'code' => 'Invalid verification code. Please try again with a different one',
                    ]);
                }

                $this->verifyEmailService->markEmailAsVerified($user);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event('verify-email')
                    ->log("User :causer.email verified user's account :subject.email");

                return EmptyJsonResource::messageResponse('Account is activated successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to verify email. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to verify email. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Resend the email verification code
     *
     * @param ResendVerifyEmailRequest $request
     *
     * @return JsonResponse
     * @throws \Throwable
     */
    public function resend(ResendVerifyEmailRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $user = $request->user();
                $this->verifyEmailService->sendEmailCodeNotification($user);

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event('verify-email')
                    ->log("User :causer.email resent a new verification code to verify user's account :subject.email");

                return EmptyJsonResource::messageResponse('The code has been sent to your email address');
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to resend email verification code. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                return EmptyJsonResource::messageResponse(
                    'Failed to resend email verification code. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
