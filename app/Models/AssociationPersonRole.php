<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class AssociationPersonRole
 *
 * @property int         $id
 * @property int         $association_id
 * @property int         $role_id
 * @property int         $person_id
 * @property Carbon      $start_date
 * @property Carbon|null $end_date
 * @property bool        $is_active
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 *
 * @property Association $association
 * @property DomainRole  $role
 * @property Person      $person
 *
 * @package App\Models
 */
class AssociationPersonRole extends Model
{
    protected $table = 'association_person_roles';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'association_id',
        'role_id',
        'person_id',
        'start_date',
        'end_date',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

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
