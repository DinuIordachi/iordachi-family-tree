<?php

namespace App\Services;

use Exception;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\NewAccessToken;
use Illuminate\Support\Facades\Hash;
use App\Repositories\UserRepository;
use Illuminate\Validation\ValidationException;

class AuthService extends BaseService
{
    public function __construct(protected readonly UserRepository $userRepository)
    {
    }

    /**
     * Attempt login with email and password.
     */
    public function attempt(string $email, string $password, bool $remember): NewAccessToken
    {
        $user = $this->userRepository->findByEmail($email);

        if (! $this->checkPassword($user, $password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials']);
        }

        $request = request();
        $accessToken = $user->createToken(
            'authToken',
            ['*'],
            $remember ? now()->addYear() : now()->addMinutes(config('sanctum.expiration')),
        );

        $accessToken->accessToken->forceFill([
            'issued_ip' => $request->ip(),
            'last_ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255),
        ])->save();

        return $accessToken;
    }

    public function checkPassword(?User $user, ?string $password): bool
    {
        return $user && $password && Hash::check($password, $user->password);
    }

    /**
     * @throws Exception
     */
    public function logout(User $user): void
    {
        if (! $user->currentAccessToken()->delete()) {
            throw new Exception('Failed to delete the token');
        }
    }

    public function logoutAll(User $user): void
    {
        $user->tokens()->delete();
    }
}
