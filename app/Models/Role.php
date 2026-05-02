<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\RolesEnum;
use App\Enums\PermissionsEnum;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Permission\Models\Role as BaseRole;

/**
 * Class Role
 *
 * @param int                         $id
 * @param string                      $name
 * @param string                      $display_name
 * @param string                      $guard_name
 * @param Carbon                      $created_at
 * @param Carbon                      $updated_at
 *
 * @param Collection<int, User>       $users
 * @param Collection<int, Permission> $permissions
 *
 * @package App\Models
 */
class Role extends BaseRole
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'display_name',
        'guard_name',
    ];

    /**
     * =================================
     * GETTERS
     * =================================
     */

    /**
     * Check if the role is in use
     *
     * @return bool
     */
    public function inUse(): bool
    {
        return $this->permissions()->exists() || $this->users()->exists();
    }

    /**
     * =================================
     * SCOPES
     * =================================
     */

    /**
     * Scope
     * Search by:
     *  name, display_name
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
            ->where('name', 'LIKE', "%{$term}%")
            ->orWhere('display_name', 'LIKE', "%{$term}%");
    }

    /**
     * Scope
     * Filter by:
     *  name, display_name
     *
     * @param Builder $builder
     * @param array   $data
     *
     * @return Builder
     */
    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (array_key_exists('name', $data) && ! is_null($data['name'])) {
            $builder->whereName($data['name']);
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
        $builder->whereGuardName(User::GUARD_NAME);

        /* @var User $user */
        $user = auth()->user();

        if ($user->isAdmin()) {
            return $builder;
        }

        $builder->whereNot('name', RolesEnum::ADMIN->value);

        $hasAnyPermission = $user->hasAnyPermission(
            PermissionsEnum::ROLE_VIEW_ANY->value,
            PermissionsEnum::ROLE_VIEW->value,
            PermissionsEnum::ROLE_CREATE->value,
            PermissionsEnum::ROLE_UPDATE->value,
            PermissionsEnum::ROLE_DELETE->value,
            PermissionsEnum::PERMISSION_VIEW->value,
            PermissionsEnum::PERMISSION_CREATE->value,
            PermissionsEnum::PERMISSION_UPDATE->value,
            PermissionsEnum::USER_VIEW->value,
            PermissionsEnum::USER_CREATE->value,
            PermissionsEnum::USER_UPDATE->value,
        );

        if ($hasAnyPermission) {
            return $builder;
        }

        return $builder->limit(0);
    }
}
