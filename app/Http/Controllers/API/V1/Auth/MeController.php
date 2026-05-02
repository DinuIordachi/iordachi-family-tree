<?php

namespace App\Http\Controllers\API\V1\Auth;

use Exception;
use App\Enums\RolesEnum;
use App\Services\AuthService;
use Illuminate\Http\Response;
use App\Services\UserService;
use App\Services\PhoneService;
use App\Enums\PermissionsEnum;
use App\Services\CountryService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\Auth\MeRequest;
use App\Http\Resources\Auth\MeResource;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Requests\Auth\MeUpdateRequest;
use Throwable;
use App\Http\Requests\Auth\MeDeleteRequest;
use Illuminate\Validation\ValidationException;

#[Group('Authentication')]
class MeController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly AuthService $authService,
        protected readonly UserService $userService,
        protected readonly PhoneService $phoneService,
        protected readonly CountryService $countryService,
    ) {

    }

    /**
     * Get current logged-in user
     *
     * @param MeRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
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
     * Update current logged-in user
     *
     * @param MeUpdateRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(MeUpdateRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $user = $request->user();
                $requestCollection = $request->collect();
                $data = $requestCollection->only([
                    'first_name', 'last_name', 'email',
                    'birthdate', 'phone', 'gender',
                ])->toArray();
                $properties = $requestCollection->only(['workPosition', 'workOrganization'])->toArray();
                $countryCode = $requestCollection->get('country_code');
                $avatarFile = $request->file('avatarFile');

                $password = strval($requestCollection->get('password'));

                $data['phone'] = $this->phoneService->formatInternational($data['phone'] ?? null);
                $data['country_id'] = $this->countryService->findByIso2($countryCode)?->id;
                $data['properties'] = array_merge($user->properties ?? [], $properties);

                if ($password) {
                    $data['password'] = Hash::make($password);
                }

                $response = $this->userService->update($user, $data);

                if (! $response) {
                    throw new Exception('Failed to update the user');
                }

                if ($avatarFile) {
                    $this->userService->saveAvatar($user, $avatarFile);
                }

                $user->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event(PermissionsEnum::USER_UPDATE->value)
                    ->log("User :subject.email profile was updated");

                return MeResource::make($user)
                    ->message('Profile updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[User] Failed to create the user. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the user. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Destroy current logged-in user
     *
     * @param MeDeleteRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(MeDeleteRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $user = $request->user();

                $this->authService->logoutAll($user);

                $response = $this->userService->delete($user);
                if (! $response) {
                    throw new Exception('Failed to delete the user');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event(PermissionsEnum::ACCOUNT_DELETE->value)
                    ->log("User :subject.email profile was deleted");

                return EmptyJsonResource::withMessage('Profile deleted successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[User] Failed to delete the user. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the user. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
