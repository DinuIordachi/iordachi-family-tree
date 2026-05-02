<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\PermissionsEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Class PersonalAccessToken
 *
 * @property int         $id
 * @property string      $name
 * @property string      $token
 * @property array       $abilities
 * @property Carbon|null $last_used_at
 * @property Carbon|null $expires_at
 * @property string|null $issued_ip
 * @property string|null $last_ip
 * @property string|null $user_agent
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property Carbon|null $deleted_at
 *
 * @property Model       $tokenable
 *
 * @package App\Models
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use SoftDeletes;

    protected $table = 'personal_access_tokens';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'token',
        'abilities',
        'last_used_at',
        'expires_at',
        'issued_ip',
        'last_ip',
        'user_agent',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'abilities' => 'json',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function isExpired(): bool
    {
        return (bool) $this->expires_at?->isBefore(now());
    }

    public function scopeSearch(Builder $builder, ?string $term = null): Builder
    {
        if ($term === null) {
            return $builder;
        }

        return $builder->whereHas('tokenable', fn (Builder $q) => $q->search($term));
    }

    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (! empty($data['user_agent'])) {
            $builder->where('user_agent', 'LIKE', "%{$data['user_agent']}%");
        }

        if (! empty($data['last_ip'])) {
            $builder->where('last_ip', $data['last_ip']);
        }

        if (! empty($data['issued_ip'])) {
            $builder->where('issued_ip', $data['issued_ip']);
        }

        if (array_key_exists('expired', $data) && is_bool($data['expired'])) {
            $data['expired']
                ? $builder->whereNotNull('expires_at')->where('expires_at', '<=', now())
                : $builder->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
        }

        if (! empty($data['user'])) {
            $builder->whereHas('tokenable', function (Builder $q) use ($data) {
                $q->whereKey($data['user'])->orWhere('email', $data['user']);
            });
        }

        return $builder;
    }

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
            PermissionsEnum::PERSONAL_ACCESS_TOKEN_VIEW_ANY->value,
            PermissionsEnum::PERSONAL_ACCESS_TOKEN_VIEW->value,
        );

        if (! $hasAnyPermission) {
            return $builder->limit(0);
        }

        return $builder->whereHas(
            'tokenable',
            fn (Builder $q) => $q->whereKey(auth()->id()),
        );
    }
}
