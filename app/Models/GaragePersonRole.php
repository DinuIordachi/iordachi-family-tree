<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class GaragePersonRole
 *
 * @property int         $id
 * @property int         $garage_id
 * @property int         $role_id
 * @property int         $person_id
 * @property string|null $ownership_percentage
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 *
 * @property Garage      $garage
 * @property DomainRole  $role
 * @property Person      $person
 *
 * @package App\Models
 */
class GaragePersonRole extends Model
{
    protected $table = 'garage_person_roles';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'garage_id',
        'role_id',
        'person_id',
        'ownership_percentage',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'ownership_percentage' => 'decimal:2',
    ];

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Relationship:
     * Garage
     *
     * @return BelongsTo
     */
    public function garage(): BelongsTo
    {
        return $this->belongsTo(Garage::class);
    }

    /**
     * Relationship:
     * Role
     *
     * @return BelongsTo
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(DomainRole::class, 'role_id');
    }

    /**
     * Relationship:
     * Person
     *
     * @return BelongsTo
     */
    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}
