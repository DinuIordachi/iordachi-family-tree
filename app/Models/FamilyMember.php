<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\PermissionsEnum;
use Spatie\MediaLibrary\HasMedia;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Spatie\MediaLibrary\InteractsWithMedia;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Class FamilyMember
 *
 * @property int                       $id
 * @property string                    $first_name
 * @property string|null               $last_name
 * @property Carbon|null               $birthdate
 * @property Carbon|null               $died_at
 * @property string|null               $gender   M or F
 * @property string|null               $biography
 * @property Carbon                    $created_at
 * @property Carbon                    $updated_at
 * @property Carbon|null               $deleted_at
 *
 * @property string|null               $thumbnail_url
 * @property Collection<int, FamilyMember> $parents
 * @property Collection<int, FamilyMember> $children
 * @property Collection<int, FamilyMember> $spouses
 *
 * @package App\Models
 */
class FamilyMember extends Model implements HasMedia
{
    /** @use HasFactory<\Database\Factories\FamilyMemberFactory> */
    use HasFactory;

    use SoftDeletes;
    use InteractsWithMedia;

    const MEDIA_THUMBNAIL_COLLECTION = 'thumbnail';
    const MEDIA_FILES_COLLECTION = 'media';

    const ALLOWED_THUMBNAIL_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ];

    const ALLOWED_MEDIA_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/webm',
    ];

    protected $fillable = [
        'first_name',
        'last_name',
        'birthdate',
        'died_at',
        'gender',
        'biography',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'died_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * A member is considered deceased once a `died_at` value is recorded
     * (regardless of whether it's in the past — historical data).
     */
    public function isDeceased(): bool
    {
        return $this->died_at !== null;
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::MEDIA_THUMBNAIL_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(self::ALLOWED_THUMBNAIL_MIMES)
            ->registerMediaConversions(function (Media $media) {
                $this->addMediaConversion('thumb')->width(200)->height(200);
            });

        $this->addMediaCollection(self::MEDIA_FILES_COLLECTION)
            ->acceptsMimeTypes(self::ALLOWED_MEDIA_MIMES);
    }

    public function thumbnailUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->getFirstMediaUrl(self::MEDIA_THUMBNAIL_COLLECTION, 'thumb') ?: null,
        );
    }

    /**
     * Members listed as parents of this member.
     */
    public function parents(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'family_member_relations',
            'child_id',
            'parent_id',
        );
    }

    /**
     * Members listed as children of this member.
     */
    public function children(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'family_member_relations',
            'parent_id',
            'child_id',
        );
    }

    /**
     * Spouse links are stored bidirectionally — when (A,B) exists, so does (B,A).
     * Persist that invariant via {@see syncSpouseIds()}.
     */
    public function spouses(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'family_member_spouses',
            'member_id',
            'spouse_id',
        );
    }

    /**
     * Reconcile spouse links from this member's perspective and mirror each
     * change on the other member's side so the pivot stays symmetric.
     */
    public function syncSpouseIds(array $spouseIds): void
    {
        $spouseIds = array_values(array_unique(array_map('intval', $spouseIds)));
        $current = $this->spouses()->pluck('family_members.id')->all();

        $toAdd = array_diff($spouseIds, $current);
        $toRemove = array_diff($current, $spouseIds);

        foreach ($toAdd as $otherId) {
            $this->spouses()->syncWithoutDetaching([$otherId]);
            self::query()->whereKey($otherId)->first()
                ?->spouses()->syncWithoutDetaching([$this->id]);
        }

        foreach ($toRemove as $otherId) {
            $this->spouses()->detach($otherId);
            self::query()->whereKey($otherId)->first()
                ?->spouses()->detach($this->id);
        }
    }

    public function scopeSearch(Builder $builder, ?string $term = null): Builder
    {
        if ($term === null) {
            return $builder;
        }
        $term = trim(strtolower($term));

        return $builder
            ->where('first_name', 'LIKE', "%{$term}%")
            ->orWhere('last_name', 'LIKE', "%{$term}%")
            ->orWhere('biography', 'LIKE', "%{$term}%");
    }

    public function scopeFilter(Builder $builder, array $data = []): Builder
    {
        if (array_key_exists('archived', $data) && is_bool($data['archived'])) {
            $data['archived'] ? $builder->onlyTrashed() : $builder->withoutTrashed();
        }

        if (! empty($data['first_name'])) {
            $builder->where('first_name', 'LIKE', "{$data['first_name']}%");
        }

        if (! empty($data['last_name'])) {
            $builder->where('last_name', 'LIKE', "{$data['last_name']}%");
        }

        if (! empty($data['gender'])) {
            $builder->where('gender', $data['gender']);
        }

        if (! empty($data['born_after'])) {
            $builder->whereDate('birthdate', '>=', $data['born_after']);
        }

        if (! empty($data['born_before'])) {
            $builder->whereDate('birthdate', '<=', $data['born_before']);
        }

        return $builder;
    }

    public function scopeAuthorized(Builder $builder): Builder
    {
        /* Soft-deleted members never surface in the default list. They will
         * be exposed through a dedicated archive view + the explicit
         * `?archived=true` filter handled in {@see scopeFilter()}. */
        return $builder;
    }
}
