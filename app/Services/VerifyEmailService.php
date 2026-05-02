<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;

class VerifyEmailService extends BaseService
{
    public function __construct(protected readonly UserRepository $userRepository)
    {
    }

    /**
     * Mark the user's email address as verified
     *
     * @param \App\Models\User $user
     *
     * @return bool
     */
    public function markEmailAsVerified(User $user): bool
    {
        $user->clearEmailCode();
        $response = $user->markEmailAsVerified();

        if (! $response) {
            return false;
        }

        return true;
    }

    /**
     * Verify the email verification code
     *
     * @param \App\Models\User $user
     * @param string|int       $code
     *
     * @return bool
     */
    public function verifyEmailCode(User $user, string|int $code): bool
    {
        if ($user->isEmailCodeExpired()) {
            return false;
        }

        return strval($user->email_code) === strval($code);
    }

    /**
     * Check if the user's email is verified
     *
     * @param \App\Models\User $user
     *
     * @return bool
     */
    public function isEmailVerified(User $user): bool
    {
        return $user->hasVerifiedEmail();
    }

    /**
     * Send a new code on the user's email address
     *
     * @param \App\Models\User $user
     *
     * @return void
     * @throws \Random\RandomException
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
}
