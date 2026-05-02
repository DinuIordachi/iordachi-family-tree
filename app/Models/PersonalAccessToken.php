<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Class PersonalAccessToken
 *
 * @property int    $id
 * @property string $name
 * @property string $token
 * @property array  $abilities
 * @property Carbon $last_used_at
 * @property Carbon $expires_at
 * @property string $issued_ip
 * @property string $issued_country_code
 * @property string $issued_country
 * @property string $user_agent
 * @property string $last_ip
 * @property string $last_country_code
 * @property string $last_country
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon $deleted_at
 *
 * @property Model  $tokenable
 *
 * @package App\Models
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use SoftDeletes;

    protected $primaryKey = 'id';

    protected $table = 'personal_access_tokens';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'token',
        'abilities',
        'last_used_at',
        'expires_at',
        'issued_ip',
        'issued_country_code',
        'issued_country',
        'user_agent',
        'last_ip',
        'last_country_code',
        'last_country',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'abilities' => 'json',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * =================================
     * GETTERS
     * =================================
     */

    /**
     * Check if the personal access token is expired
     *
     * @return bool
     */
    public function isExpired(): bool
    {
        return boolval($this->expires_at?->isBefore(now()));
    }


    /**
     * =================================
     * SCOPES
     * =================================
     */

    /**
     * Scope
     * Search by:
     *  tokenable, expires_at, issued_ip,
     *  issued_country_code, issued_country, user_agent,
     *  last_ip, last_country_code, last_country
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

        return $builder
            ->whereHas('tokenable', fn (Builder $builder) => $builder->search($term));
    }

    /**
     * Scope
     * Filter by:
     *  tokenable, expires_at, issued_ip,
     *  issued_country_code, issued_country, user_agent,
     *  last_ip, last_country_code, last_country
     *
     * @param Builder $builder
     * @param array   $data
     *
     * @return Builder
     */
    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (array_key_exists('userAgent', $data) && ! is_null($data['userAgent'])) {
            $builder->where('userAgent', $data['userAgent']);
        }

        if (array_key_exists('last_ip', $data) && ! is_null($data['last_ip'])) {
            $builder->where('last_ip', $data['last_ip']);
        }

        if (array_key_exists('last_country_code', $data) && ! is_null($data['last_country_code'])) {
            $builder->where('last_country_code', $data['last_country_code']);
        }

        if (array_key_exists('issued_ip', $data) && ! is_null($data['issued_ip'])) {
            $builder->where('issued_ip', $data['issued_ip']);
        }

        if (array_key_exists('issued_country_code', $data) && ! is_null($data['issued_country_code'])) {
            $builder->where('issued_country_code', $data['issued_country_code']);
        }

        if (array_key_exists('expired', $data) && is_bool($data['expired'])) {
            if ($data['expired']) {
                $builder->whereDate('expires_at', '<=', now());
            } else {
                $builder
                    ->whereDate('expires_at', '>=', now())
                    ->orWhereNull('expires_at');
            }
        }

        if (array_key_exists('user', $data) && ! is_null($data['user'])) {
            $builder->whereHas('tokenable', function ($query) use ($data) {
                $query->whereKey($data['user'])->orWhere('email', $data['user']);
            });
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
            PermissionsEnum::PERSONAL_ACCESS_TOKEN_VIEW_ANY->value,
            PermissionsEnum::PERSONAL_ACCESS_TOKEN_VIEW->value,
        );

        if (! $hasAnyPermission) {
            return $builder->limit(0);
        }

        if ($user->isOrganizer()) {
            return $builder->whereHas('tokenable', function (Builder $query) {
                $query
                    ->whereKey(auth()->id())
                    ->orWhereHas('roles', function (Builder $query) {
                        $query->where('name', RolesEnum::MEMBER->value);
                    });
            });
        }

        return $builder->whereHas(
            'tokenable',
            fn (Builder $query) => $query->whereKey(auth()->id()),
        );
    }
}
