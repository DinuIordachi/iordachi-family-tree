<?php

namespace App\Services;

use DateTime;
use Throwable;
use BackedEnum;
use App\Models\User;
use App\Models\Role;
use App\Enums\RolesEnum;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Hash;

/**
 * Class UserService
 *
 * @template-extends BaseRepositoryService<UserRepository, User>
 *
 * @package App\Services
 */
class UserService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(UserRepository::class);
    }

    /**
     * Find a user by email
     *
     * @param string $email
     *
     * @return User|null
     */
    public function findByEmail(string $email): User|null
    {
        return $this->repository->findByEmail($email);
    }

    /**
     * Find a user by email code
     *
     * @param string|int $code
     *
     * @return User|null
     */
    public function findByEmailCode(string|int $code): User|null
    {
        return $this->repository->findByEmailCode($code);
    }

    /**
     * Set the password for a user
     *
     * @param User   $user
     * @param string $password
     *
     * @return bool
     */
    public function setPassword(User $user, string $password): bool
    {
        return $this->repository->update($user->id, ['password' => $password]);
    }

    /**
     * Invite a user
     *
     * @param array $data
     *
     * @return User|null
     */
    public function invite(array $data): ?User
    {
        $data['password'] = $this->generatePassword();

        $response = $this->create($data);

        if (! $response) {
            return null;
        }

        $roles = [RolesEnum::MEMBER->value];

        if (array_key_exists('roles', $data) && is_array($data['roles']) && count($data['roles'])) {
            $roles = array_map(function ($item) {
                $item = trim($item);

                return is_numeric($item) ? intval($item) : $item;
            }, $data['roles']);
        }

        $this->setRoles($response, $roles);

        return $response;
    }

    /**
     * Generate random password
     *
     * @return string
     */
    public function generatePassword(): string
    {
        return Str::password(12, true, true, false);
    }

    /**
     * Send a registration notification to user
     *
     * @param User $user
     *
     * @return void
     */
    public function sendRegistrationNotification(User $user): void
    {
        $password = $this->generatePassword();
        $this->update($user, ['password' => Hash::make($password)]);
        $user->sendRegistrationNotification($password);
    }

    /**
     * Send membership application received notification with Cerere attachment
     *
     * @param User   $user
     * @param string $cererePdf
     * @param string $cerereFilename
     *
     * @return void
     */
    public function sendMembershipApplicationReceivedNotification(
        User $user,
        string $cererePdf,
        string $cerereFilename
    ): void {
        $user->sendMembershipApplicationReceivedNotification($cererePdf, $cerereFilename);
    }

    /**
     * Send membership approval notification
     *
     * @param User $user
     *
     * @return void
     */
    public function sendMembershipApprovedNotification(User $user): void
    {
        $user->sendMembershipApprovedNotification();
    }

    /**
     * Send membership rejection notification
     *
     * @param User   $user
     * @param string $reason
     *
     * @return void
     */
    public function sendMembershipRejectedNotification(User $user, string $reason): void
    {
        $user->sendMembershipRejectedNotification($reason);
    }

    /**
     * Mark the user as registered
     *
     * @param User               $user
     * @param DateTime|bool|null $status
     *
     * @return void
     */
    public function updateRegistered(User $user, DateTime|bool|null $status = true): void
    {
        $user->updateRegistered($status);
    }

    /**
     * Set new roles for the user
     *
     * @param User                                         $user
     * @param string|int|array|Role|Collection|\BackedEnum ...$roles
     *
     * @return void
     */
    public function setRoles(
        User $user,
        string|int|array|Role|Collection|BackedEnum  ...$roles
    ): void {
        $user->syncRoles($roles);
    }

    /**
     * Save the user's enrollment proof file
     *
     * @param User         $user
     * @param UploadedFile $file
     *
     * @return void
     * @throws \Spatie\MediaLibrary\MediaCollections\Exceptions\FileDoesNotExist
     * @throws \Spatie\MediaLibrary\MediaCollections\Exceptions\FileIsTooBig
     */
    public function saveEnrollmentProofFile(User $user, UploadedFile $file): void
    {
        $user
            ->addMedia($file)
            ->preservingOriginal()
            ->toMediaCollection(User::MEDIA_ENROLLMENT_PROOF_COLLECTION);
    }

    /**
     * Save the user's avatar
     *
     * @param User         $user
     * @param UploadedFile $file
     *
     * @return void
     * @throws \Spatie\MediaLibrary\MediaCollections\Exceptions\FileDoesNotExist
     * @throws \Spatie\MediaLibrary\MediaCollections\Exceptions\FileIsTooBig
     */
    public function saveAvatar(User $user, UploadedFile $file): void
    {
        $user->addMedia($file)->toMediaCollection(User::MEDIA_AVATAR_COLLECTION);
    }
}
