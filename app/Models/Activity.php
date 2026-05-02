<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\PermissionsEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Models\Activity as BaseActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Class Activity
 *
 * @param int    $id
 * @param string $log_name
 * @param string $secription
 * @param string $event
 * @param string $batch_uuid
 * @param array  $properties
 * @param Carbon $created_at
 * @param Carbon $updated_at
 *
 * @param Model  $causer
 * @param Model  $subject
 *
 * @package App\Models
 */
class Activity extends BaseActivity
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'log_name',
        'description',
        'event',
        'properties',
        'batch_uuid',
    ];

    /**
     * =================================
     * SCOPES
     * =================================
     */

    /**
     * Scope
     * Search by:
     *  log_name, description, event
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
            ->where('log_name', 'LIKE', "%{$term}%")
            ->orWhere('description', 'LIKE', "%{$term}%")
            ->orWhere('event', 'LIKE', "%{$term}%");
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
        if (array_key_exists('log_name', $data) && ! is_null($data['log_name'])) {
            $builder->whereLogName($data['log_name']);
        }

        if (array_key_exists('event', $data) && ! is_null($data['event'])) {
            $builder->whereEvent($data['event']);
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

        if ($user?->isAdmin()) {
            return $builder;
        }

        $hasAnyPermission = $user?->hasAnyPermission(
            PermissionsEnum::ACTIVITY_VIEW_ANY->value,
            PermissionsEnum::ACTIVITY_VIEW->value,
        );

        return $hasAnyPermission ? $builder : $builder->limit(0);
    }
}
