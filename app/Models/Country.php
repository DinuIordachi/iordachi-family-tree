<?php

namespace App\Models;

use Illuminate\Support\Uri;
use Illuminate\Database\Eloquent\Builder;
use Nnjeim\World\Models\Country as BaseCountry;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Class User
 *
 * @property int    $id
 * @property string $iso2
 * @property string $name
 * @property bool   $status
 * @property int    $phone_code
 * @property string $iso3
 * @property string $region
 * @property string $subregion
 * @property string $emoji
 * @property string $emojiU
 *
 * @package App\Models
 */
class Country extends BaseCountry
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'iso2',
        'name',
        'status',
        'phone_code',
        'iso3',
        'region',
        'subregion',
        'emoji',
        'emojiU',
    ];

    public $timestamps = false;

    /**
     * Get flag url
     *
     * @param string|null $imageSize
     *
     * @return string|null
     */
    public function getFlagUrl(?string $imageSize = '24x18'): ?string
    {
        $baseUrl = config('world.flag_url');
        $iso2 = strtolower(trim($this->iso2));

        if (! $baseUrl) {
            return null;
        }

        return Uri::of($baseUrl)->withPath("/$imageSize/$iso2.png");
    }

    /**
     * =================================
     * SCOPES
     * =================================
     */

    /**
     * Scope
     * Search by:
     *  iso2, name, phone_code,
     *  region, subregion, iso3
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
            ->where('iso2', 'LIKE', "%{$term}%")
            ->orWhere('name', 'LIKE', "%{$term}%")
            ->orWhere('phone_code', 'LIKE', "%{$term}%")
            ->orWhere('region', 'LIKE', "%{$term}%")
            ->orWhere('subregion', 'LIKE', "%{$term}%")
            ->orWhere('iso3', 'LIKE', "%{$term}%");
    }

    /**
     * Scope
     * Filter by:
     *   log_name, event
     *
     * @param Builder $builder
     * @param array   $data
     *
     * @return Builder
     */
    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (array_key_exists('iso2', $data) && ! is_null($data['iso2'])) {
            $builder->where('iso2', $data['iso2']);
        }

        if (array_key_exists('iso3', $data) && ! is_null($data['iso3'])) {
            $builder->where('iso3', $data['iso3']);
        }

        if (array_key_exists('name', $data) && ! is_null($data['name'])) {
            $builder->where('name', $data['name']);
        }

        if (array_key_exists('phone_code', $data) && ! is_null($data['phone_code'])) {
            $builder->where('phone_code', $data['phone_code']);
        }

        if (array_key_exists('region', $data) && ! is_null($data['region'])) {
            $builder->where('region', $data['region']);
        }

        if (array_key_exists('subregion', $data) && ! is_null($data['subregion'])) {
            $builder->where('subregion', $data['subregion']);
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
        return $builder;
    }
}
