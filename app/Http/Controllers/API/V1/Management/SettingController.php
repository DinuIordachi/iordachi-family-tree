<?php

namespace App\Http\Controllers\API\V1\Management;

use Throwable;
use Illuminate\Http\Response;
use App\Enums\PermissionsEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use App\Http\Resources\EmptyJsonResource;
use Illuminate\Validation\ValidationException;
use App\Http\Requests\Setting\ListSettingRequest;
use App\Http\Requests\Setting\UpdateSettingRequest;
use Spatie\LaravelSettings\SettingsRepositories\SettingsRepository;

class SettingController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly SettingsRepository $settingsRepository)
    {
    }

    /**
     * List settings
     *
     * @unauthenticated
     *
     * @param ListSettingRequest $request
     *
     * @return JsonResponse
     */
    public function index(ListSettingRequest $request): JsonResponse
    {
        $groups = $this->getRegisteredGroups();

        if ($request->has('group')) {
            $groups = array_unique(
                str_contains($request->get('group'), ',')
                    ? explode(',', $request->get('group'))
                    : [$request->get('group')]
            );
        }

        return EmptyJsonResource::collection($this->getSettings($groups))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Update settings
     *
     * @param UpdateSettingRequest $request
     *
     * @return JsonResponse
     * @throws Throwable
     */
    public function update(UpdateSettingRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $groups = $this->getRegisteredGroups();
                $data = $request->collect($groups);
                $updatedGroups = $data->keys();

                $data->each(function ($settings, $group) use ($request) {
                    $this->settingsRepository->updatePropertiesPayload($group, $settings);
                    activity()
                        ->causedBy($request->user())
                        ->event(PermissionsEnum::SETTINGS_UPDATE->value)
                        ->log("Settings in $group group were updated by :causer.email");
                });

                return EmptyJsonResource::collection($this->getSettings($updatedGroups))
                    ->additional(['message' => 'Settings updated successfully.'])
                    ->response()
                    ->setStatusCode(Response::HTTP_OK);
            },
            function (Throwable $throwable) {
                logger()->error('[Setting] Failed to update the settings. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse(
                    'Failed to update the settings. Contact our support or try again later',
                    Response::HTTP_INTERNAL_SERVER_ERROR
                );
            }
        );
    }

    /**
     * Get registered groups
     *
     * @return array
     */
    private function getRegisteredGroups(): array
    {
        return array_map(function ($settingsClass) {
            return $settingsClass::group();
        }, config('settings.settings'));
    }

    /**
     * Get settings from groups
     *
     * @param $groups
     *
     * @return Collection
     */
    private function getSettings($groups): Collection
    {
        $settings = collect();

        foreach ($groups as $group) {
            $group = trim($group);
            $settings->put($group, $this->settingsRepository->getPropertiesInGroup($group));
        }

        return $settings;
    }
}
