<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Exception;
use App\Models\User;
use App\Enums\RolesEnum;
use Illuminate\Http\Response;
use App\Services\UserService;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
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

    public function __construct(protected readonly UserService $userService)
    {
    }

    /**
     * List users.
     *
     * @response array{data:UserResource[]}
     */
    public function index(ListUserRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->userService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only(['first_name', 'last_name', 'email', 'verified', 'blocked', 'role', 'archived'])->toArray(),
        )->paginate($data->get('page_size', 20));

        return UserResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a user.
     *
     * @response array{data:UserResource}
     */
    public function show(ShowUserRequest $request, User $user): JsonResponse
    {
        return UserResource::make($user)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a user.
     *
     * @response array{message:string,data:UserResource}
     *
     * @throws Throwable
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $data = $request->collect()->only(['first_name', 'last_name', 'email', 'password'])->toArray();
                $data['password'] = Hash::make($data['password']);

                $user = $this->userService->create($data);
                if (! $user) {
                    throw new Exception('Failed to create the user');
                }

                $roles = (array) $request->input('roles', [RolesEnum::MEMBER->value]);
                $this->userService->setRoles($user, $roles);

                if ($file = $request->file('avatarFile')) {
                    $this->userService->saveAvatar($user, $file);
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
            fn (Throwable $t) => $this->reportFailure('create', $t),
        );
    }

    /**
     * Update a user.
     *
     * @response array{message:string,data:UserResource}
     *
     * @throws Throwable
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $user) {
                $data = $request->collect()
                    ->only(['first_name', 'last_name', 'email', 'blocked_at'])
                    ->toArray();

                if ($password = $request->input('password')) {
                    $data['password'] = Hash::make($password);
                }

                if (! $this->userService->update($user, $data)) {
                    throw new Exception('Failed to update the user');
                }

                if ($request->has('roles')) {
                    $this->userService->setRoles($user, (array) $request->input('roles'));
                }

                if ($file = $request->file('avatarFile')) {
                    $this->userService->saveAvatar($user, $file);
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
            fn (Throwable $t) => $this->reportFailure('update', $t),
        );
    }

    /**
     * Soft-delete a user.
     *
     * @response array{message:string}
     *
     * @throws Throwable
     */
    public function destroy(DeleteUserRequest $request, User $user): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $user) {
                if (! $this->userService->delete($user)) {
                    throw new Exception('Failed to delete the user');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($user)
                    ->event(PermissionsEnum::USER_DELETE->value)
                    ->log('User :subject.email was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('User was deleted successfully');
            },
            fn (Throwable $t) => $this->reportFailure('delete', $t),
        );
    }

    /**
     * Permanently delete a user.
     *
     * @throws Throwable
     */
    public function forceDestroy(ForceDeleteUserRequest $request, User $user): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $user) {
                $email = $user->email;

                if (! $this->userService->forceDelete($user)) {
                    throw new Exception('Failed to force delete the user');
                }

                activity()
                    ->causedBy($request->user())
                    ->event(PermissionsEnum::USER_FORCE_DELETE->value)
                    ->log("User {$email} was force deleted by :causer.email");

                return EmptyJsonResource::messageResponse('User was force deleted successfully');
            },
            fn (Throwable $t) => $this->reportFailure('force delete', $t),
        );
    }

    /**
     * Invite users by email.
     *
     * @response array{data:UserResource[]}
     *
     * @throws Throwable
     */
    public function invite(InviteUserRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $invitations = Collection::make();

                foreach ($request->collect('invites') as $data) {
                    $user = $this->userService->invite($data);

                    if (! $user) {
                        logger()->warning('[User] Failed to invite a user', $data);
                        continue;
                    }

                    $invitations->push($user);

                    activity()
                        ->causedBy($request->user())
                        ->performedOn($user)
                        ->event(PermissionsEnum::USER_INVITE->value)
                        ->log('User :subject.email was invited by :causer.email');
                }

                return UserResource::collection($invitations)
                    ->additional(['message' => 'Users were invited successfully'])
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            fn (Throwable $t) => $this->reportFailure('invite', $t),
        );
    }

    private function reportFailure(string $action, Throwable $throwable): JsonResponse
    {
        logger()->error("[User] Failed to {$action} the user. Error: " . $throwable->getMessage(), $throwable->getTrace());

        if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
            throw $throwable;
        }

        return EmptyJsonResource::messageResponse(
            "Failed to {$action} the user. Contact our support or try again later",
            Response::HTTP_INTERNAL_SERVER_ERROR,
        );
    }
}
