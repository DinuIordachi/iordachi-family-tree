<?php

namespace App\Http\Controllers\API\V1\Security;

use Throwable;
use Exception;
use App\Models\User;
use App\Models\Permission;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use App\Services\PermissionService;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\Permission\PermissionResource;
use App\Http\Requests\Permission\ListPermissionRequest;
use App\Http\Requests\Permission\ShowPermissionRequest;
use App\Http\Requests\Permission\StorePermissionRequest;
use App\Http\Requests\Permission\UpdatePermissionRequest;
use App\Http\Requests\Permission\DeletePermissionRequest;

class PermissionController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly PermissionService $permissionService)
    {

    }

    /**
     * List permissions
     *
     * @param ListPermissionRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListPermissionRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->permissionService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([
                'name',
            ])->toArray(),
        )->paginate($data->get('page_size', 20));

        return PermissionResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get a permission
     *
     * @param ShowPermissionRequest $request
     * @param Permission            $permission
     *
     * @return JsonResponse
     */
    public function show(ShowPermissionRequest $request, Permission $permission): JsonResponse
    {
        return PermissionResource::make($permission)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Create a permission
     *
     * @param StorePermissionRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function store(StorePermissionRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                /* @ignoreParam */
                $data = $request->only(['name', 'display_name']);

                $data['guard_name'] = User::GUARD_NAME;
                $response = $this->permissionService->create($data);

                if (! $response) {
                    throw new Exception('Failed to update the permission');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($response)
                    ->event(PermissionsEnum::PERMISSION_CREATE->value)
                    ->log('Permission :subject.display_name was created by :causer.email');

                return PermissionResource::make($response)
                    ->message('Permission was created successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Permission] Failed to create the permission. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to create the permission. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Update a permission
     *
     * @param UpdatePermissionRequest $request
     * @param Permission              $permission
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdatePermissionRequest $request, Permission $permission): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $permission) {
                /* @ignoreParam */
                $data = $request->only(['name', 'display_name']);

                if ($permission->inUse() && $permission->name !== $data['name']) {
                    throw ValidationException::withMessages([
                        'name' => "While the role is in use, you can't update this field.",
                    ]);
                }

                $data['guard_name'] = User::GUARD_NAME;
                $response = $this->permissionService->update($permission, $data);

                if (! $response) {
                    throw new Exception('Failed to update the permission');
                }

                $permission->refresh();

                activity()
                    ->causedBy($request->user())
                    ->performedOn($permission)
                    ->event(PermissionsEnum::PERMISSION_UPDATE->value)
                    ->log('Permission :subject.display_name was updated by :causer.email');

                return PermissionResource::make($permission)
                    ->message('Permission was updated successfully')
                    ->response()
                    ->setStatusCode(Response::HTTP_CREATED);
            },
            function (Throwable $throwable) {
                logger()->error('[Permission] Failed to update the permission. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the permission. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Delete a permission
     *
     * @param DeletePermissionRequest $request
     * @param Permission              $permission
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeletePermissionRequest $request, Permission $permission): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $permission) {
                $response = $this->permissionService->delete($permission);

                if (! $response) {
                    throw new Exception('Failed to delete the permission');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($permission)
                    ->event(PermissionsEnum::PERMISSION_DELETE->value)
                    ->log('Permission :subject.display_name was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Permission was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Permission] Failed to delete the permission. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the permission. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
