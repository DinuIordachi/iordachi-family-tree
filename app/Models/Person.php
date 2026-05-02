<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Person
 *
 * @property int                                    $id
 * @property string                                 $first_name
 * @property string                                 $last_name
 * @property string|null                            $patronymic
 * @property string                                 $name_id
 * @property Carbon                                 $created_at
 * @property Carbon                                 $updated_at
 *
 * @property Collection<int, Contact>               $contacts
 * @property Collection<int, GaragePersonRole>      $garageRoles
 * @property Collection<int, AssociationPersonRole> $associationRoles
 *
 * @package App\Models
 */
class Person extends Model
{
    protected $table = 'persons';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'patronymic',
        'name_id',
    ];

    /**
     * =================================
     * HOOKS
     * =================================
     */

    /**
     * Boot the model
     *
     * @return void
     */
    protected static function booted(): void
    {
        static::creating(function (Person $person) {
            if (empty($person->name_id)) {
                $person->name_id = static::generateNameId(
                    $person->last_name,
                    $person->first_name,
                    $person->patronymic,
                );
            }
        });
    }

    /**
     * Generate a unique name_id
     *
     * @param string      $lastName
     * @param string      $firstName
     * @param string|null $patronymic
     *
     * @return string
     */
    protected static function generateNameId(string $lastName, string $firstName, ?string $patronymic = null): string
    {
        $parts = [
            Str::lower(Str::replace(' ', '-', $lastName)),
            Str::lower(Str::replace(' ', '-', $firstName)),
        ];

        if ($patronymic !== null) {
            $parts[] = Str::lower(Str::replace(' ', '-', $patronymic));
        }

        $baseNameId = implode('-', $parts);
        $nameId = $baseNameId;
        $counter = 1;

        while (static::where('name_id', $nameId)->exists()) {
            $counter++;
            $nameId = $baseNameId . '-' . $counter;
        }

        return $nameId;
    }

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Relationship:
     * Contacts
     *
     * @return HasMany
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    /**
     * Relationship:
     * Garage Roles
     *
     * @return HasMany
     */
    public function garageRoles(): HasMany
    {
        return $this->hasMany(GaragePersonRole::class);
    }

    /**
     * Relationship:
     * Association Roles
     *
     * @return HasMany
     */
    public function associationRoles(): HasMany
    {
        return $this->hasMany(AssociationPersonRole::class);
    }
}
