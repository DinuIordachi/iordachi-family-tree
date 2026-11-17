<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Support\Str;
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
     * Short entity names used by the API, mapped to model classes.
     *
     * @var array<string, class-string<Model>>
     */
    public const SUBJECT_TYPES = [
        'family-member' => FamilyMember::class,
        'user' => User::class,
        'role' => Role::class,
        'permission' => Permission::class,
        'activity' => Activity::class,
        'personal-access-token' => PersonalAccessToken::class,
        'media' => \Spatie\MediaLibrary\MediaCollections\Models\Media::class,
    ];

    /**
     * Short entity name for a model class (e.g. "family-member"), or null.
     */
    public static function subjectTypeName(?string $class): ?string
    {
        if ($class === null) {
            return null;
        }

        return array_search($class, self::SUBJECT_TYPES, true) ?: Str::kebab(class_basename($class));
    }

    /**
     * Scope
     * Case-insensitive, literal (wildcards escaped) search over the description,
     * event, log name, subject type, before/after values and the causer's
     * first name, last name, full name and email.
     *
     * @param Builder     $builder
     * @param string|null $term
     *
     * @return Builder
     */
    public function scopeSearch(Builder $builder, ?string $term = null): Builder
    {
        $term = mb_strtolower(trim((string) $term));

        if ($term === '') {
            return $builder;
        }

        $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term) . '%';
        $mysql = $builder->getConnection()->getDriverName() === 'mysql';
        $properties = $mysql ? 'CAST(properties AS CHAR)' : 'properties';
        $fullName = $mysql ? "CONCAT(first_name, ' ', last_name)" : "first_name || ' ' || last_name";
        $match = fn (string $column) => "LOWER({$column}) LIKE ? ESCAPE '!'";

        return $builder->where(function (Builder $q) use ($like, $match, $properties, $fullName) {
            $q->whereRaw($match('description'), [$like])
                ->orWhereRaw($match('event'), [$like])
                ->orWhereRaw($match('log_name'), [$like])
                ->orWhereRaw($match('subject_type'), [$like])
                ->orWhereRaw($match($properties), [$like])
                ->orWhereHasMorph('causer', [User::class], function (Builder $u) use ($like, $match, $fullName) {
                    $u->withTrashed()->where(fn (Builder $w) => $w
                        ->whereRaw($match('email'), [$like])
                        ->orWhereRaw($match($fullName), [$like]));
                });
        });
    }

    /**
     * Scope
     * Filter by:
     *   log_name, event, causer_id, subject_type (short name), date_from, date_to (Y-m-d, inclusive)
     *
     * @param Builder $builder
     * @param array   $data
     *
     * @return Builder
     */
    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (filled($data['log_name'] ?? null)) {
            $builder->where('log_name', $data['log_name']);
        }

        if (filled($data['event'] ?? null)) {
            $builder->where('event', $data['event']);
        }

        if (filled($data['causer_id'] ?? null)) {
            $builder->where('causer_type', User::class)->where('causer_id', (int) $data['causer_id']);
        }

        if (filled($data['subject_type'] ?? null)) {
            $builder->where('subject_type', self::SUBJECT_TYPES[$data['subject_type']] ?? $data['subject_type']);
        }

        if (filled($data['date_from'] ?? null)) {
            $builder->where('created_at', '>=', Carbon::parse($data['date_from'])->startOfDay());
        }

        if (filled($data['date_to'] ?? null)) {
            $builder->where('created_at', '<=', Carbon::parse($data['date_to'])->endOfDay());
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

        return $user?->isAdmin() ? $builder : $builder->whereRaw('1 = 0');
    }
}
