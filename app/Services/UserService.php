<?php

namespace App\Services;

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
 * @template-extends BaseRepositoryService<UserRepository, User>
 */
class UserService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(UserRepository::class);
    }

    public function findByEmail(string $email): ?User
    {
        return $this->repository->findByEmail($email);
    }

    public function findByEmailCode(string|int $code): ?User
    {
        return $this->repository->findByEmailCode($code);
    }

    public function setPassword(User $user, string $password): bool
    {
        return $this->repository->update($user->id, ['password' => Hash::make($password)]);
    }

    /**
     * Invite a user — generate a temporary password, create the user,
     * assign the requested roles (defaults to MEMBER) and notify.
     */
    public function invite(array $data): ?User
    {
        $password = $this->generatePassword();
        $data['password'] = $password;

        $user = $this->create($data);
        if (! $user) {
            return null;
        }

        $roles = ! empty($data['roles']) && is_array($data['roles'])
            ? $data['roles']
            : [RolesEnum::MEMBER->value];

        $this->setRoles($user, $roles);
        $user->sendRegistrationNotification($password);

        return $user;
    }

    public function generatePassword(): string
    {
        return Str::password(12, true, true, false);
    }

    /**
     * @param string|int|array|Role|Collection|BackedEnum ...$roles
     */
    public function setRoles(User $user, string|int|array|Role|Collection|BackedEnum ...$roles): void
    {
        $user->syncRoles($roles);
    }

    public function saveAvatar(User $user, UploadedFile $file): void
    {
        $user->addMedia($file)->toMediaCollection(User::MEDIA_AVATAR_COLLECTION);
    }
}
