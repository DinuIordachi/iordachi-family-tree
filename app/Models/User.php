<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;
use Laravel\Sanctum\HasApiTokens;
use Spatie\MediaLibrary\HasMedia;
use Illuminate\Auth\MustVerifyEmail;
use Spatie\Permission\Traits\HasRoles;
use App\Notifications\CodeNotification;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Builder;
use Spatie\MediaLibrary\InteractsWithMedia;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Notifications\RegistrationNotification;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Permission\Models\Role as SpatieRole;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailInterface;

/**
 * Class User
 *
 * @property int                                       $id
 * @property string                                    $first_name
 * @property string|null                               $last_name
 * @property string                                    $email
 * @property string|null                               $password
 * @property string|null                               $email_code
 * @property Carbon|null                               $email_code_expires_at
 * @property string|null                               $remember_token
 * @property Carbon|null                               $email_verified_at
 * @property Carbon|null                               $blocked_at
 * @property Carbon                                    $created_at
 * @property Carbon                                    $updated_at
 * @property Carbon|null                               $deleted_at
 *
 * @property string|null                               $avatar_url
 * @property Collection<int, SpatieRole>               $roles
 * @property Collection<int, SpatiePermission>         $permissions
 *
 * @package App\Models
 */
class User extends Authenticatable implements MustVerifyEmailInterface, HasMedia
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory;

    use SoftDeletes;
    use HasApiTokens;
    use HasRoles;
    use Notifiable;
    use InteractsWithMedia;
    use MustVerifyEmail;

    const GUARD_NAME = 'api';

    const MEDIA_AVATAR_COLLECTION = 'avatar';

    protected string $guard_name = self::GUARD_NAME;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'email_code',
        'email_code_expires_at',
        'blocked_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'email_code',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'email_code_expires_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'blocked_at' => 'datetime',
        'deleted_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Assign the default role on creation.
     */
    protected static function booted(): void
    {
        static::created(function (User $user) {
            if ($user->roles()->count() === 0) {
                $user->assignRole(RolesEnum::MEMBER->value);
            }
        });
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(static::MEDIA_AVATAR_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/jpg', 'image/png', 'image/gif'])
            ->registerMediaConversions(function (Media $media) {
                $this->addMediaConversion('thumb')->width(200)->height(200);
            });
    }

    public function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->getFirstMediaUrl(static::MEDIA_AVATAR_COLLECTION, 'thumb') ?: null,
        );
    }

    public function setEmailCode(string $code): void
    {
        $this->forceFill([
            'email_code' => $code,
            'email_code_expires_at' => now()->addMinutes(5),
        ])->save();
    }

    public function clearEmailCode(): void
    {
        $this->forceFill([
            'email_code' => null,
            'email_code_expires_at' => null,
        ])->save();
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(RolesEnum::ADMIN->value);
    }

    public function isPublisher(): bool
    {
        return $this->hasRole(RolesEnum::PUBLISHER->value);
    }

    public function isMember(): bool
    {
        return $this->hasRole(RolesEnum::MEMBER->value);
    }

    public function isBlocked(): bool
    {
        return (bool) $this->blocked_at?->isBefore(now());
    }

    public function isEmailCodeExpired(): bool
    {
        return $this->email_code_expires_at === null
            || $this->email_code_expires_at->isBefore(now());
    }

    public function sendRegistrationNotification(?string $password = null): void
    {
        $this->notify(new RegistrationNotification($password));
    }

    public function sendResetPasswordNotification(): void
    {
        $this->notify(new ResetPasswordNotification());
    }

    public function sendCodeNotification(): void
    {
        $this->notify(new CodeNotification());
    }

    /**
     * Search by first_name, last_name, email.
     */
    public function scopeSearch(Builder $builder, ?string $term = null): Builder
    {
        if ($term === null) {
            return $builder;
        }
        $term = trim(strtolower($term));

        return $builder
            ->where('first_name', 'LIKE', "%{$term}%")
            ->orWhere('last_name', 'LIKE', "%{$term}%")
            ->orWhere('email', 'LIKE', "%{$term}%");
    }

    /**
     * Filter by first_name, last_name, email, verified, blocked, role, archived.
     */
    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (array_key_exists('archived', $data) && is_bool($data['archived'])) {
            $data['archived'] ? $builder->onlyTrashed() : $builder->withoutTrashed();
        }

        if (! empty($data['first_name'])) {
            $builder->where('first_name', 'LIKE', "{$data['first_name']}%");
        }

        if (! empty($data['last_name'])) {
            $builder->where('last_name', 'LIKE', "{$data['last_name']}%");
        }

        if (! empty($data['email'])) {
            $builder->where('email', 'LIKE', "%{$data['email']}%");
        }

        if (array_key_exists('verified', $data) && is_bool($data['verified'])) {
            $data['verified']
                ? $builder->whereNotNull('email_verified_at')
                : $builder->whereNull('email_verified_at');
        }

        if (array_key_exists('blocked', $data) && is_bool($data['blocked'])) {
            $data['blocked']
                ? $builder->whereNotNull('blocked_at')
                : $builder->whereNull('blocked_at');
        }

        if (! empty($data['role'])) {
            $roles = is_array($data['role'])
                ? $data['role']
                : array_map('trim', explode(',', $data['role']));
            $builder->role($roles);
        }

        return $builder;
    }

    /**
     * Restrict the result set to records the current user is allowed to see.
     */
    public function scopeAuthorized(Builder $builder): Builder
    {
        /** @var User|null $user */
        $user = auth()->user();

        if (! $user) {
            return $builder->limit(0);
        }

        if ($user->isAdmin()) {
            return $builder->withTrashed();
        }

        $hasAnyPermission = $user->hasAnyPermission(
            PermissionsEnum::USER_VIEW_ANY->value,
            PermissionsEnum::USER_VIEW->value,
        );

        if (! $hasAnyPermission) {
            return $builder->limit(0);
        }

        return $builder->whereHas(
            'roles',
            fn (Builder $query) => $query->whereIn('name', [RolesEnum::MEMBER->value]),
        );
    }
}
