<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\User;
use App\Enums\RolesEnum;
use Illuminate\Http\Response;
use App\Services\UserService;
use App\Enums\PermissionsEnum;
use App\Services\PhoneService;
use App\Services\CountryService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\Auth\MeResource;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\User\UserResource;
use App\Http\Requests\User\ListUserRequest;
use App\Http\Requests\User\ShowUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use Illuminate\Database\Eloquent\Collection;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Requests\User\DeleteUserRequest;
use App\Http\Requests\User\InviteUserRequest;
use Illuminate\Validation\ValidationException;
use App\Http\Requests\User\ForceDeleteUserRequest;

class UserController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly UserService $userService,
        protected readonly CountryService $countryService,
        protected readonly PhoneService $phoneService
    ) {

    }

    /**
     * List users
     *
     * @response array{data:UserResource[]}
     *
     * @param ListUserRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListUserRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->userService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([
                'gender', 'email', 'properties',
                'first_name', 'last_name', 'phone',
                'verified', 'blocked', 'role',
                'country', 'archived', 'paid',
            ])->toArray(),
        );

        $records = $records->paginate($data->get('page_size', 20));

        return UserResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a user
     *
     * @response array{data:UserResource}
     *
     * @param ShowUserRequest $request
     * @param User            $user
     *
     * @return JsonResponse
     */
    public function show(ShowUserRequest $request, User $user): JsonResponse
    {
        if ($request->user()->hasPermissionTo(PermissionsEnum::USER_VIEW)) {
            return UserResource::make($user)
                ->response()
                ->setStatusCode(Response::HTTP_OK);
        }

        return MeResource::make($user)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a user
     *
     * @response array{message:string,data:UserResource}
     *
     * @param StoreUserRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $requestCollection = $request->collect();
                $data = $requestCollection->only([
                    'first_name', 'last_name', 'email',
                    'birthdate', 'phone', 'gender',
                    'password', 'active_at', 'approved_at',
                ])->toArray();
                $properties = $requestCollection->only(['taxId', 'workPosition', 'workOrganization'])->toArray();
                $countryCode = $requestCollection->get('country_code');
                $avatarFile = $request->file('avatarFile');

                $data['phone'] = $this->phoneService->formatInternational($data['phone'] ?? null);
                $data['country_id'] = $this->countryService->findByIso2($countryCode)?->id;
                $data['properties'] = $properties;

                $user = $this->userService->create($data);
                if (! $user) {
                    throw new Exception('Failed to create the user');
                }

                if ($request->has('roles')) {
                    $user->syncRoles($request->get('roles'));
                }

                if ($user->roles()->doesntExist()) {
                    $this->userService->setRoles($user, RolesEnum::MEMBER->value);
                }

                if ($avatarFile) {
                    $this->userService->saveAvatar($user, $avatarFile);
                }

                $user->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event(PermissionsEnum::USER_CREATE->value)
                    ->log('User :subject.email was created by :causer.email');

                return UserResource::make($user)
                    ->message('User was created successfully')
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
     * Update a user
     *
     * @response array{message:string,data:UserResource}
     *
     * @param UpdateUserRequest $request
     * @param User              $user
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $user) {
                $requestCollection = $request->collect();
                $data = $requestCollection->only([
                    'first_name', 'last_name', 'email',
                    'birthdate', 'phone', 'gender',
                    'blocked_at', 'active_at', 'approved_at',
                ])->toArray();
                $properties = $requestCollection->only(['taxId', 'workPosition', 'workOrganization'])->toArray();
                $countryCode = $requestCollection->get('country_code');
                $password = $requestCollection->get('password');
                $avatarFile = $request->file('avatarFile');

                $data['phone'] = $this->phoneService->formatInternational($data['phone'] ?? null);
                $data['country_id'] = $this->countryService->findByIso2($countryCode)?->id;
                $data['properties'] = $properties;

                if (! empty($password)) {
                    $data['password'] = $password;
                }

                $response = $this->userService->update($user, $data);
                if (! $response) {
                    throw new Exception('Something went wrong while updating the user');
                }

                if ($request->has('roles')) {
                    $user->syncRoles($request->get('roles'));
                }

                if ($user->roles()->doesntExist()) {
                    $this->userService->setRoles($user, RolesEnum::MEMBER->value);
                }

                if ($avatarFile) {
                    $this->userService->saveAvatar($user, $avatarFile);
                }

                $user->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event(PermissionsEnum::USER_UPDATE->value)
                    ->log('User :subject.email was updated by :causer.email');

                return UserResource::make($user)
                    ->message('User was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[User] Failed to update the user. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the user. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a user
     *
     * @response array{message:string}
     *
     * @param DeleteUserRequest $request
     * @param User              $user
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteUserRequest $request, User $user): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $user) {
                $response = $this->userService->delete($user);

                if (! $response) {
                    throw new Exception('Failed to delete the user');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event(PermissionsEnum::USER_DELETE->value)
                    ->log('User :subject.email was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('User was deleted successfully');
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

    /**
     * Force delete a user
     *
     * @param ForceDeleteUserRequest $request
     * @param User                   $user
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function forceDestroy(ForceDeleteUserRequest $request, User $user): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $user) {
                $response = $this->userService->forceDelete($user);

                if (! $response) {
                    throw new Exception('Failed to force delete the user');
                }

                activity()
                    ->causedBy($request->user())
                    ->event(PermissionsEnum::USER_FORCE_DELETE->value)
                    ->log("User $user->email was force deleted by :causer.email");

                return EmptyJsonResource::messageResponse('User was force deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[PersonalAccessToken] Failed to force delete the user. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to force delete the user. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Invite users
     *
     * @response array{data:UserResource[]}
     *
     * @param InviteUserRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function invite(InviteUserRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $invites = $request->collect('invites');
                $invitations = Collection::make([]);

                $invites->each(function ($data) use ($request, $invitations) {
                    $data['phone'] = $this->phoneService->formatInternational($data['phone'] ?? null);

                    $response = $this->userService->invite($data);

                    if (! $response) {
                        logger()->warning('[User] Failed to invite a user', $data);

                        return;
                    }

                    $invitations->push($response);

                    activity()
                        ->causedBy($request->user())
                        ->performedOn($response)
                        ->event(PermissionsEnum::USER_INVITE->value)
                        ->log('User :subject.email was invited by :causer.email');
                });

                return UserResource::collection($invitations)
                    ->additional(['message' => 'Users were invited successfully'])
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[User] Failed to invite the users. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to invite the users. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
