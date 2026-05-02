<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Association
 *
 * @property int                                        $id
 * @property string                                     $name
 * @property string                                     $address
 * @property string|null                                $phone
 * @property array|null                                 $cadastral_numbers
 * @property Carbon                                     $created_at
 * @property Carbon                                     $updated_at
 *
 * @property Collection<int, Garage>                    $garages
 * @property Collection<int, AssociationPersonRole>     $personRoles
 *
 * @package App\Models
 */
class Association extends Model
{
    protected $table = 'associations';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'address',
        'phone',
        'cadastral_numbers',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'cadastral_numbers' => 'array',
    ];

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Relationship:
     * Garages
     *
     * @return HasMany
     */
    public function garages(): HasMany
    {
        return $this->hasMany(Garage::class);
    }

    /**
     * Relationship:
     * Person Roles
     *
     * @return HasMany
     */
    public function personRoles(): HasMany
    {
        return $this->hasMany(AssociationPersonRole::class);
    }
}
