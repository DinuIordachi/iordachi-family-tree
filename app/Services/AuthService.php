<?php

namespace App\Services;

use Exception;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\NewAccessToken;
use Illuminate\Support\Facades\Hash;
use App\Repositories\UserRepository;
use Stevebauman\Location\Facades\Location;
use Illuminate\Validation\ValidationException;

class AuthService extends BaseService
{
    public function __construct(protected readonly UserRepository $userRepository)
    {
    }

    /**
     * Attempt login with email and password
     * The function will register a new access token,
     * will save user's login details and
     * will log the activity
     *
     * @param $email
     * @param $password
     * @param $remember
     *
     * @return \Laravel\Sanctum\NewAccessToken
     * @throws \Illuminate\Validation\ValidationException
     */
    public function attempt($email, $password, $remember): NewAccessToken
    {
        $user = $this->userRepository->findByEmail($email);

        $response = $this->checkPassword($user, $password);
        if (! $response) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials']);
        }

        $ip = request()->getClientIp();
        $agent = request()->userAgent();
        $geo = Location::get($ip);

        if (is_bool($geo)) {
            $geo = null;
        }

        $accessToken = $user->createToken(
            'authToken',
            ['*'],
            $remember ? now()->addYear() : now()->addMinutes(config('sanctum.expiration'))
        );

        $accessToken->accessToken->forceFill([
            'issued_ip' => $ip,
            'issued_country_code' => $geo?->countryCode,
            'issued_country' => $geo?->countryName,
            'user_agent' => Str::limit($agent, 255),
            // Last
            'last_ip' => $ip,
            'last_country_code' => $geo?->countryCode,
            'last_country' => $geo?->countryName,
        ])->save();

        return $accessToken;
    }

    /**
     * Check the password
     *
     * @param \App\Models\User|null $user
     * @param string|null           $password
     *
     * @return bool
     */
    public function checkPassword(?User $user, ?string $password): bool
    {
        return $user && Hash::check($password, $user->password);
    }

    /**
     * Register a new user
     *
     * @param $email
     * @param $password
     *
     * @return void
     */
    public function register($email, $password)
    {
        // TODO: Implement registration
    }

    /**
     * Logout a user
     * Remove access token and log the activity
     *
     * @param \App\Models\User $user
     *
     * @return void
     * @throws \Exception
     */
    public function logout(User $user): void
    {
        $response = $user->currentAccessToken()->delete();

        if (! $response) {
            throw new Exception('Failed to delete the token');
        }
    }

    /**
     * Logout a user from all sessions
     *
     * @param \App\Models\User $user
     *
     * @return void
     */
    public function logoutAll(User $user): void
    {
        $user->tokens()->delete();
    }
}
