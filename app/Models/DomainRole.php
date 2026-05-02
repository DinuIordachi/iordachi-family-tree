<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\DomainRoleNameEnum;
use App\Enums\DomainRoleScopeEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class DomainRole
 *
 * @property int                                        $id
 * @property DomainRoleNameEnum                         $name
 * @property DomainRoleScopeEnum                        $scope
 * @property Carbon                                     $created_at
 * @property Carbon                                     $updated_at
 *
 * @property Collection<int, GaragePersonRole>          $garagePersonRoles
 * @property Collection<int, AssociationPersonRole>     $associationPersonRoles
 *
 * @package App\Models
 */
class DomainRole extends Model
{
    protected $table = 'domain_roles';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'scope',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'name' => DomainRoleNameEnum::class,
        'scope' => DomainRoleScopeEnum::class,
    ];

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Relationship:
     * Garage Person Roles
     *
     * @return HasMany
     */
    public function garagePersonRoles(): HasMany
    {
        return $this->hasMany(GaragePersonRole::class, 'role_id');
    }

    /**
     * Relationship:
     * Association Person Roles
     *
     * @return HasMany
     */
    public function associationPersonRoles(): HasMany
    {
        return $this->hasMany(AssociationPersonRole::class, 'role_id');
    }
}
