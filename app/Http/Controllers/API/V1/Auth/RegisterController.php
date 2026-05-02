<?php

namespace App\Http\Controllers\API\V1\Auth;

use Throwable;
use App\Enums\RolesEnum;
use Illuminate\Support\Str;
use App\Services\UserService;
use App\Services\MembershipService;
use App\Services\PhoneService;
use App\Services\CountryService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Resources\EmptyJsonResource;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\RegisterResource;
use Illuminate\Validation\ValidationException;

#[Group('Authentication')]
class RegisterController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(
        protected readonly UserService $userService,
        protected readonly CountryService $countryService,
        protected readonly PhoneService $phoneService,
        protected readonly MembershipService $membershipService,
    ) {
    }

    /**
     * Register a user
     *
     * @unauthenticated
     *
     * @param \App\Http\Requests\Auth\RegisterRequest $request
     *
     * @return \Illuminate\Http\JsonResponse
     * @throws \Throwable
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        return $this->wrapInTransaction(
            function () use ($request) {
                $requestCollection = $request->collect();
                $data = $requestCollection->only([
                    'first_name', 'last_name', 'email',
                    'birthdate', 'phone', 'gender',
                ])->toArray();
                $requestedActiveAt = $requestCollection->get('active_at');
                $properties = $requestCollection->only(['taxId', 'workPosition', 'workOrganization'])->toArray();
                $signature = strval($requestCollection->get('signature'));
                $countryCode = $requestCollection->get('country_code');

                $user = $this->userService->findByEmail($data['email']);

                $data['phone'] = $this->phoneService->formatInternational($data['phone'] ?? null);
                $data['country_id'] = $this->countryService->findByIso2($countryCode)?->id;
                $data['properties'] = array_merge($user?->properties ?? [], $properties);

                if (! $user) {
                    $data['password'] = bcrypt(Str::random());
                    $user = $this->userService->create($data);
                } else {
                    $response = $this->userService->update($user, $data);
                    if (! $response) {
                        throw new \Exception('Something went wrong while updating the user');
                    }
                }

                if ($user->roles()->doesntExist()) {
                    $this->userService->setRoles($user, RolesEnum::MEMBER->value);
                }

                $this->userService->updateRegistered($user);
                $this->membershipService->registerApplication($user, [
                    'first_name' => $data['first_name'] ?? $user->first_name,
                    'last_name' => $data['last_name'] ?? $user->last_name,
                    'birthdate' => $data['birthdate'] ?? $user->birthdate,
                    'work_position' => strval($properties['workPosition'] ?? ''),
                    'work_organization' => strval($properties['workOrganization'] ?? ''),
                    'email' => $user->email,
                    'phone' => strval($data['phone'] ?? ''),
                    'active_at' => $requestedActiveAt,
                ], $signature);

                $user->refresh();

                return RegisterResource::make($user)
                    ->message('User registered successfully')
                    ->response()
                    ->setStatusCode(201);
            },
            function (Throwable $throwable) {
                logger()->error('[Auth] Failed to register. Error: ' . $throwable->getMessage(),
                    $throwable->getTrace());

                if ($throwable instanceof ValidationException || app()->hasDebugModeEnabled()) {
                    throw $throwable;
                }

                return EmptyJsonResource::messageResponse('Failed to register. Contact our support or try again later');
            }
        );
    }
}
