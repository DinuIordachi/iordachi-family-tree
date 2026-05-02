<?php

namespace App\Http\Controllers\API\V1\Management;

use App\Models\DomainRole;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use App\Services\DomainRoleService;
use Illuminate\Support\Facades\Gate;
use App\Http\Controllers\Controller;
use App\Http\Resources\DomainRole\DomainRoleResource;

class DomainRoleController extends Controller
{
    public function __construct(protected readonly DomainRoleService $domainRoleService)
    {

    }

    /**
     * List all domain roles
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', DomainRole::class);

        $records = $this->domainRoleService->getAll();

        return DomainRoleResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
