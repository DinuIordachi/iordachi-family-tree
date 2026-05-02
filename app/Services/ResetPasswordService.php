<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;

class ResetPasswordService extends BaseService
{
    public function __construct(protected readonly UserRepository $userRepository)
    {
    }

    /**
     * Reset user's password
     *
     * @param \App\Models\User $user
     * @param string           $password
     *
     * @return bool
     */
    public function resetPassword(User $user, string $password): bool
    {
        $user->clearEmailCode();
        $response = $this->userRepository->update($user->id, ['password' => $password]);

        if (! $response) {
            return false;
        }

        return true;
    }

    /**
     * Send a new code on the user's email address
     *
     * @param \App\Models\User $user
     *
     * @return void
     */
    public function sendEmailCodeNotification(User $user): void
    {
        $this->generateEmailCode($user);
        $user->sendCodeNotification();
    }

    /**
     * Generate email verification code
     *
     * @param \App\Models\User $user
     *
     * @return int
     * @throws \Random\RandomException
     */
    public function generateEmailCode(User $user): int
    {
        do {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while ($this->userRepository->builder()->where('email_code', $code)->exists());

        $user->setEmailCode($code);

        return $code;
    }

    /**
     * Send a reset password notification to
     * user's email address
     *
     * @param \App\Models\User $user
     *
     * @return void
     */
    public function sendResetPasswordNotification(User $user): void
    {
        $user->sendResetPasswordNotification();
    }
}
