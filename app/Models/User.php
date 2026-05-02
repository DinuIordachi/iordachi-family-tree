<?php

namespace App\Models;

use DateTime;
use Carbon\Carbon;
use App\Enums\RolesEnum;
use Illuminate\Support\Str;
use App\Enums\PermissionsEnum;
use Laravel\Sanctum\HasApiTokens;
use Spatie\MediaLibrary\HasMedia;
use Spatie\Permission\Models\Role;
use Illuminate\Auth\MustVerifyEmail;
use Spatie\Permission\Traits\HasRoles;
use App\Notifications\CodeNotification;
use Spatie\Permission\Models\Permission;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Builder;
use Propaganistas\LaravelPhone\PhoneNumber;
use Spatie\MediaLibrary\InteractsWithMedia;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Notifications\RegistrationNotification;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailInterface;

/**
 * Class User
 *
 * @property int                                $id
 * @property string                             $first_name
 * @property string                             $last_name
 * @property Carbon                             $birthdate
 * @property int|null                           $country_id
 * @property int|null                           $phone
 * @property string|null                        $gender Ex:null,male,female
 * @property array                              $properties
 * @property string                             $email
 * @property string|null                        $avatar_url
 * @property string|null                        $enrollment_proof_url
 * @property string|null                        $password
 * @property string|null                        $email_code
 * @property string|null                        $email_code_expires_at
 * @property string|null                        $remember_token
 * @property Carbon|null                        $blocked_at
 * @property Carbon|null                        $email_verified_at
 * @property Carbon|null                        $registered_at
 * @property Carbon|null                        $active_at
 * @property Carbon|null                        $approved_at
 * @property Carbon                             $created_at
 * @property Carbon                             $updated_at
 * @property Carbon                             $deleted_at
 *
 * @property Country                            $country
 * @property Collection<int, Role>              $roles
 * @property Collection<int, Permission>        $permissions
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

    const MEDIA_ENROLLMENT_PROOF_COLLECTION = 'enrollment-proof';

    protected string $guard_name = self::GUARD_NAME;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'birthdate',
        'country_id',
        'phone_country_code',
        'phone',
        'gender',
        'email',
        'password',
        'email_code',
        'email_code_expires_at',
        'blocked_at',
        'registered_at',
        'active_at',
        'approved_at',
        'properties',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'email_code',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'birthdate' => 'datetime',
        'registered_at' => 'datetime',
        'active_at' => 'datetime',
        'approved_at' => 'datetime',
        'deleted_at' => 'datetime',
        'email_code_expires_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'blocked_at' => 'datetime',
        'password' => 'hashed',
        'properties' => 'json',
    ];

    /**
     * =================================
     * HOOKS
     * =================================
     */

    /**
     * Create the default statuses for a new list
     *
     * @return void
     */
    protected static function booted(): void
    {
        static::created(function (User $user) {
            if ($user->roles()->count() === 0) {
                $user->assignRole(RolesEnum::MEMBER->value);
            }
        });
    }

    /**
     * Setup media library for User model
     *
     * @return void
     */
    public function registerMediaCollections(): void
    {
        $gender = $this->gender ?? 'male';
        $this
            ->addMediaCollection(static::MEDIA_AVATAR_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/jpg', 'image/png', 'image/gif'])
            ->useFallbackUrl(asset("/images/default-avatar/$gender.png"), 'thumb')
            ->useFallbackPath(public_path("/images/default-avatar/$gender.png"), 'thumb')
            ->registerMediaConversions(function (Media $media) {
                $this
                    ->addMediaConversion('thumb')
                    ->width(200)
                    ->height(200);
            });
        $this
            ->addMediaCollection(static::MEDIA_ENROLLMENT_PROOF_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes([
                'image/jpeg',
                'image/jpg',
                'image/png',
                'text/csv',
                'application/zip',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            ]);
    }

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Country
     *
     * @return BelongsTo
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    /**
     * =================================
     * SETTERS
     * =================================
     */

    /**
     * Set the email verification code
     *
     * @param string $code
     *
     * @return void
     */
    public function setEmailCode(string $code): void
    {
        $this->forceFill([
            'email_code' => $code,
            'email_code_expires_at' => now()->addMinutes(5.1),
        ])->save();
    }

    /**
     * Clear the email verification code
     *
     * @return void
     */
    public function clearEmailCode(): void
    {
        $this->forceFill([
            'email_code' => null,
            'email_code_expires_at' => null,
        ])->save();
    }

    /**
     * =================================
     * GETTERS
     * =================================
     */

    /**
     * Attribute: avatar_url
     *
     * @return Attribute
     */
    public function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                $media = $this->getFirstMediaUrl(static::MEDIA_AVATAR_COLLECTION, 'thumb');

                if (! empty($media)) {
                    return $media;
                } else {
                    return null;
                }
            },
        );
    }

    /**
     * Attribute: enrollment_proof_url
     *
     * @return Attribute
     */
    public function enrollmentProofUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                $media = $this->getFirstMediaUrl(static::MEDIA_ENROLLMENT_PROOF_COLLECTION);

                if (! empty($media)) {
                    return $media;
                } else {
                    return null;
                }
            },
        );
    }

    /**
     * Check if the user is Admin
     *
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->hasRole(RolesEnum::ADMIN->value);
    }

    /**
     * Check if the user is Publisher
     *
     * @return bool
     */
    public function isPublisher(): bool
    {
        return $this->hasRole(RolesEnum::PUBLISHER->value);
    }

    /**
     * Check if the user is Member
     *
     * @return bool
     */
    public function isMember(): bool
    {
        return $this->hasRole(RolesEnum::MEMBER->value);
    }

    /**
     * Check if the user is blocked
     *
     * @return bool
     */
    public function isBlocked(): bool
    {
        return boolval($this->blocked_at?->isBefore(now()));
    }

    /**
     * Check if the user is registered
     *
     * @return bool
     */
    public function isRegistered(): bool
    {
        return boolval($this->registered_at?->isBefore(now()));
    }

    /**
     * Check if the user is active
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return boolval($this->active_at?->isBefore(now()));
    }

    /**
     * Check if the user is approved
     *
     * @return bool
     */
    public function isApproved(): bool
    {
        return boolval($this->approved_at?->isBefore(now()));
    }

    /**
     * Verify if email verification code is expired
     *
     * @return bool
     */
    public function isEmailCodeExpired(): bool
    {
        return $this->email_code_expires_at < Carbon::now();
    }

    /**
     * Update registered status on the instance
     *
     * @param DateTime|bool|null $status
     *
     * @return bool
     */
    public function updateRegistered(DateTime|bool|null $status = true): bool
    {
        if ($status instanceof DateTime) {
            return $this->forceFill(['registered_at' => $status])->save();
        } elseif ($status === true) {
            return $this->forceFill(['registered_at' => now()])->save();
        }

        return $this->forceFill(['registered_at' => null])->save();
    }

    /**
     * Update active status on the instance
     *
     * @param DateTime|bool|null $status
     *
     * @return bool
     */
    public function updateActive(DateTime|bool|null $status = true): bool
    {
        if ($status instanceof DateTime) {
            return $this->forceFill(['active_at' => $status])->save();
        } elseif ($status === true) {
            return $this->forceFill(['active_at' => now()])->save();
        }

        return $this->forceFill(['active_at' => null])->save();
    }

    /**
     * Update approved status on the instance
     *
     * @param DateTime|bool|null $status
     *
     * @return bool
     */
    public function updateApproved(DateTime|bool|null $status = true): bool
    {
        if ($status instanceof DateTime) {
            return $this->forceFill(['approved_at' => $status])->save();
        } elseif ($status === true) {
            return $this->forceFill(['approved_at' => now()])->save();
        }

        return $this->forceFill(['approved_at' => null])->save();
    }


    /**
     * =================================
     * NOTIFICATIONS
     * =================================
     */

    /**
     * Send registration notification
     *
     * @param string|null $password
     *
     * @return void
     */
    public function sendRegistrationNotification(?string $password = null): void
    {
        $this->notify(new RegistrationNotification($password));
    }

    /**
     * Send reset password notification
     *
     * @return void
     */
    public function sendResetPasswordNotification(): void
    {
        $this->notify(new ResetPasswordNotification());
    }

    /**
     * Send a notification with verification code
     *
     * @return void
     */
    public function sendCodeNotification(): void
    {
        $this->notify(new CodeNotification());
    }

    /**
     * =================================
     * SCOPES
     * =================================
     */

    /**
     * Scope
     * Search by:
     *  first_name, last_name, phone, gender, blocked, email
     *
     * @param Builder     $builder
     * @param string|null $term
     *
     * @return Builder
     */
    public function scopeSearch(Builder $builder, ?string $term = null): Builder
    {
        if ($term === null) {
            return $builder;
        }
        $term = trim(strtolower($term));

        if (str_contains('blocked', $term)) {
            $builder->whereNotNull('blocked_at');
        }

        if (str_contains('registered', $term)) {
            $builder->whereNotNull('registered_at');
        }

        if (str_contains('active', $term)) {
            $builder->whereNotNull('active_at');
        }

        if (str_contains('approved', $term)) {
            $builder->whereNotNull('approved_at');
        }

        $phone = phone($term);
        if ($phone instanceof PhoneNumber && $phone->isValid()) {
            $countryCode = $phone->getCountry();
            $number = Str::replaceStart($countryCode, '', $phone->getRawNumber());
            $number = Str::replaceStart('0', '', $number);

            $builder
                ->where('phone', $number)
                ->where('phone_country_code', $countryCode);
        }

        return $builder
            ->where('first_name', 'LIKE', "%{$term}%")
            ->orWhere('last_name', 'LIKE', "%{$term}%")
            ->orWhere('phone', 'LIKE', "%{$term}%")
            ->orWhere('email', 'LIKE', "%{$term}%")
            ->orWhereHas('country', fn ($query) => $query->search($term));
    }

    /**
     * Scope
     * Filter by:
     *  first_name, last_name, phone, gender, blocked, email
     *
     * @param Builder $builder
     * @param array   $data
     *
     * @return Builder
     */
    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (array_key_exists('archived', $data) && is_bool($data['archived'])) {
            if ($data['archived']) {
                $builder->onlyTrashed();
            } else {
                $builder->withoutTrashed();
            }
        }

        if (array_key_exists('first_name', $data) && ! is_null($data['first_name'])) {
            $builder->where('first_name', 'LIKE', "{$data['first_name']}%");
        }

        if (array_key_exists('last_name', $data) && ! is_null($data['last_name'])) {
            $builder->where('last_name', 'LIKE', "{$data['last_name']}%");
        }

        if (array_key_exists('email', $data) && ! is_null($data['email'])) {
            $builder->where('email', 'LIKE', "%{$data['email']}%");
        }

        if (array_key_exists('gender', $data) && ! is_null($data['gender'])) {
            $builder->whereGender($data['gender']);
        }

        if (array_key_exists('phone', $data) && ! is_null($data['phone'])) {
            $builder->where('phone', 'LIKE', "{$data['phone']}%");
        }

        if (array_key_exists('verified', $data) && is_bool($data['verified'])) {
            if ($data['verified']) {
                $builder->whereDate('email_verified_at', '<=', now());
            } else {
                $builder
                    ->whereDate('email_verified_at', '>=', now())
                    ->orWhereNull('email_verified_at');
            }
        }

        if (array_key_exists('registered', $data) && is_bool($data['registered'])) {
            if ($data['registered']) {
                $builder->whereDate('registered_at', '<=', now());
            } else {
                $builder
                    ->whereDate('registered_at', '>=', now())
                    ->orWhereNull('registered_at');
            }
        }

        if (array_key_exists('blocked', $data) && is_bool($data['blocked'])) {
            if ($data['blocked']) {
                $builder->whereDate('blocked_at', '<=', now());
            } else {
                $builder
                    ->whereDate('blocked_at', '>=', now())
                    ->orWhereNull('blocked_at');
            }
        }

        if (array_key_exists('active', $data) && is_bool($data['active'])) {
            if ($data['active']) {
                $builder->whereDate('active_at', '<=', now());
            } else {
                $builder
                    ->whereDate('active_at', '>=', now())
                    ->orWhereNull('active_at');
            }
        }

        if (array_key_exists('approved', $data) && is_bool($data['approved'])) {
            if ($data['approved']) {
                $builder->whereDate('approved_at', '<=', now());
            } else {
                $builder
                    ->whereDate('approved_at', '>=', now())
                    ->orWhereNull('approved_at');
            }
        }

        if (array_key_exists('country', $data) && ! is_null($data['country'])) {
            if (str_contains($data['country'], ',')) {
                $countries = array_map(function ($item) {
                    $item = trim($item);

                    return is_numeric($item) ? intval($item) : $item;
                }, explode(',', $data['country']));
            } else {
                $countries = [
                    is_numeric($data['country']) ? intval($data['country']) : $data['country'],
                ];
            }

            $builder->whereHas('country', function (Builder $query) use ($countries) {
                $query
                    ->whereIn($query->getModel()->getQualifiedKeyName(), $countries)
                    ->orWhereIn($query->qualifyColumn('iso2'), $countries);
            });
        }

        if (array_key_exists('role', $data) && ! is_null($data['role'])) {
            if (str_contains($data['role'], ',')) {
                $roles = array_map(function ($item) {
                    $item = trim($item);

                    return is_numeric($item) ? intval($item) : $item;
                }, explode(',', $data['role']));
            } else {
                $roles = [
                    is_numeric($data['role']) ? intval($data['role']) : $data['role'],
                ];
            }

            $builder->role($roles);
        }

        return $builder;
    }

    /**
     * Scope
     * Authorize records
     *
     * @param Builder $builder
     *
     * @return Builder
     */
    public function scopeAuthorized(Builder $builder): Builder
    {
        /* @var User $user */
        $user = auth()->user();

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
            fn (Builder $query) => $query->whereIn(
                'name',
                [RolesEnum::MEMBER->value]
            ),
        );
    }
}
