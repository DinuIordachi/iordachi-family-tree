<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\GarageStatusEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class Garage
 *
 * @property int                                    $id
 * @property int                                    $association_id
 * @property string                                 $name
 * @property GarageStatusEnum                       $status
 * @property string                                 $city
 * @property string                                 $street
 * @property string|null                            $internal_address
 * @property string|null                            $address_number
 * @property string                                 $cadastral_number
 * @property string                                 $area
 * @property Carbon                                 $created_at
 * @property Carbon                                 $updated_at
 *
 * @property Association                            $association
 * @property Collection<int, GaragePersonRole>      $personRoles
 *
 * @package App\Models
 */
class Garage extends Model
{
    protected $table = 'garages';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'association_id',
        'name',
        'status',
        'city',
        'street',
        'internal_address',
        'address_number',
        'cadastral_number',
        'area',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'status' => GarageStatusEnum::class,
        'area' => 'decimal:2',
    ];

    public $timestamps = true;

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Relationship:
     * Association
     *
     * @return BelongsTo
     */
    public function association(): BelongsTo
    {
        return $this->belongsTo(Association::class);
    }

    /**
     * Relationship:
     * Person Roles
     *
     * @return HasMany
     */
    public function personRoles(): HasMany
    {
        return $this->hasMany(GaragePersonRole::class);
    }
}
