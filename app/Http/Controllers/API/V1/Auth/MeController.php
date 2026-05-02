<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use Exception;
use App\Enums\RolesEnum;
use App\Services\AuthService;
use Illuminate\Http\Response;
use App\Services\UserService;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\Auth\MeRequest;
use App\Http\Resources\Auth\MeResource;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Requests\Auth\MeUpdateRequest;
use App\Http\Requests\Auth\MeDeleteRequest;
use Illuminate\Validation\ValidationException;

#[Group('Authentication')]
class MeController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly AuthService $authService,
        protected readonly UserService $userService,
    ) {
    }

    /**
     * Get the current authenticated user.
     */
    public function __invoke(MeRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user->roles()->count() === 0) {
            $user->assignRole(RolesEnum::MEMBER->value);
        }

        return MeResource::make($user)->response()->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Update the current authenticated user.
     *
     * @throws Throwable
     */
    public function update(MeUpdateRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $user = $request->user();
                $data = $request->collect()->only(['first_name', 'last_name', 'email'])->toArray();

                if ($password = $request->input('password')) {
                    $data['password'] = Hash::make($password);
                }

                if (! $this->userService->update($user, $data)) {
                    throw new Exception('Failed to update the user');
                }

                if ($file = $request->file('avatarFile')) {
                    $this->userService->saveAvatar($user, $file);
                }

                $user->refresh();

                activity()
                    ->causedBy($user)
                    ->performedOn($user)
                    ->event(PermissionsEnum::ACCOUNT_UPDATE->value)
                    ->log('User :subject.email updated their profile');

                return MeResource::make($user)
                    ->message('Profile updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Me] Failed to update profile. Error: ' . $throwable->getMessage(), $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update profile. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR,
                );
            },
        );
    }

    /**
     * Delete the current authenticated user.
     *
     * @throws Throwable
     */
    public function destroy(MeDeleteRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $user = $request->user();

                $this->authService->logoutAll($user);

                if (! $this->userService->delete($user)) {
                    throw new Exception('Failed to delete the user');
                }

                activity()
                    ->causedBy($user)
                    ->performedOn($user)
                    ->event(PermissionsEnum::ACCOUNT_DELETE->value)
                    ->log('User :subject.email deleted their profile');

                return EmptyJsonResource::withMessage('Profile deleted successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Me] Failed to delete profile. Error: ' . $throwable->getMessage(), $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete profile. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR,
                );
            },
        );
    }
}
