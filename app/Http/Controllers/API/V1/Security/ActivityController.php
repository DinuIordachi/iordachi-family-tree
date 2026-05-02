<?php

namespace App\Http\Controllers\API\V1\Security;

use Throwable;
use Exception;
use App\Models\Activity;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use App\Services\ActivityService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\Activity\ActivityResource;
use App\Http\Requests\Activity\ListActivityRequest;
use App\Http\Requests\Activity\ShowActivityRequest;
use App\Http\Requests\Activity\DeleteActivityRequest;

class ActivityController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly ActivityService $activityService)
    {

    }

    /**
     * List activities
     *
     * @param ListActivityRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListActivityRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->activityService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'created_at'),
            $data->get('order_direction', 'desc'),
            $data->only([
                'log_name',
                'event',
            ])->toArray(),
        )->paginate($data->get('page_size', 20));

        return ActivityResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Get an activity
     *
     * @param ShowActivityRequest $request
     * @param Activity            $activity
     *
     * @return JsonResponse
     */
    public function show(ShowActivityRequest $request, Activity $activity): JsonResponse
    {
        return ActivityResource::make($activity)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Delete an activity
     *
     * @param DeleteActivityRequest $request
     * @param Activity              $activity
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(DeleteActivityRequest $request, Activity $activity): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request, $activity) {
                $response = $this->activityService->delete($activity);

                if (! $response) {
                    throw new Exception('Failed to delete the activity');
                }

                activity()
                    ->causedBy($request->user())
                    ->performedOn($activity)
                    ->event(PermissionsEnum::ACTIVITY_DELETE->value)
                    ->log('Activity #:subject.id was deleted by :causer.email');

                return EmptyJsonResource::messageResponse('Activity was deleted successfully');
            },
            function (Throwable $throwable) {
                logger()->error('[Activity] Failed to delete the activity. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to delete the activity. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }
}
