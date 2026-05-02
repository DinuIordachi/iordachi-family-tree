<?php

namespace App\Http\Controllers\API\V1\Security;

use Throwable;
use Exception;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Response;
use App\Services\RoleService;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Resources\Role\RoleResource;
use App\Http\Requests\Role\ListRoleRequest;
use App\Http\Requests\Role\ShowRoleRequest;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Requests\Role\DeleteRoleRequest;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\Role\LimitedRoleResource;

class RoleController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly RoleService $roleService)
    {

    }

    /**
     * List roles
     *
     * @param ListRoleRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListRoleRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->roleService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([
                'name',
            ])->toArray(),
        )->paginate($data->get('page_size', 20));

        if ($request->user()->hasPermissionTo(PermissionsEnum::ROLE_VIEW_ANY->value)) {
            return RoleResource::collection($records)
                ->response()
                ->setStatusCode(Response::HTTP_OK);
        }

        return LimitedRoleResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a role
     *
     * @param ShowRoleRequest $request
     * @param Role            $role
     *
     * @return JsonResponse
     */
    public function show(ShowRoleRequest $request, Role $role): JsonResponse
    {
        if ($request->user()->hasPermissionTo(PermissionsEnum::ROLE_VIEW->value)) {
            return RoleResource::make($role)
                ->response()
                ->setStatusCode(Response::HTTP_OK);
        }

        return LimitedRoleResource::make($role)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a role
     *
     * @param StoreRoleRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                /* @ignoreParam */
                $data = $request->only(['name', 'display_name']);

                $data['guard_name'] = User::GUARD_NAME;
                $response = $this->roleService->create($data);

                if (! $response) {
                    throw new Exception('Failed to update the role');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($response)
                    ->event(PermissionsEnum::ROLE_CREATE->value)
                    ->log('Role :subject.display_name was created by :causer.email');

                return RoleResource::make($response)
                    ->message('Role was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Role] Failed to create the role. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the role. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update a role
     *
     * @param UpdateRoleRequest $request
     * @param Role              $role
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $role) {
                /* @ignoreParam */
                $data = $request->only(['name', 'display_name']);

                if ($role->inUse() && $role->name !== $data['name']) {
                    throw ValidationException::withMessages([
                        'name' => "While the role is in use, you can't update this field.",
                    ]);
                }

                $data['guard_name'] = User::GUARD_NAME;
                $response = $this->roleService->update($role, $data);

                if (! $response) {
                    throw new Exception('Failed to update the role');
                }

                $role->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($role)
                    ->event(PermissionsEnum::ROLE_UPDATE->value)
                    ->log('Role :subject.display_name was updated by :causer.email');

                return RoleResource::make($role)
                    ->message('Role was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Role] Failed to update the role. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the role. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a role
     *
     * @param DeleteRoleRequest $request
     * @param Role              $role
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteRoleRequest $request, Role $role): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $role) {
                $response = $this->roleService->delete($role);

                if (! $response) {
                    throw new Exception('Failed to delete the role');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($role)
                    ->event(PermissionsEnum::ROLE_DELETE->value)
                    ->log('Role :subject.display_name was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Role was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Role] Failed to delete the role. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the role. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
