<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Interface EloquentRepository
 *
 * @template TModel of Model
 *
 * @package App\Repositories
 */
interface EloquentRepository
{
    /**
     * Get builder
     *
     * @return Builder<TModel>
     */
    public function builder(): Builder;

    /**
     * Get all
     *
     * @return Collection<int,TModel>
     */
    public function all(): Collection;

    /**
     * Get paginated
     *
     * @param int|null $perPage Default: null
     *
     * @return LengthAwarePaginator<int,TModel>
     */
    public function paginate(?int $perPage = null): LengthAwarePaginator;

    /**
     * Search
     *
     * @param string|null $term Default: null
     *
     * @return static
     */
    public function search(?string $term = null): static;

    /**
     * Filter
     *
     * @param array $data Default: []
     *
     * @return static
     */
    public function filter(array $data = []): static;

    /**
     * Authorize
     *
     * @return static
     */
    public function authorized(): static;

    /**
     * With trashed
     *
     * @return static
     */
    public function withTrashed(): static;

    /**
     * Only trashed
     *
     * @return static
     */
    public function onlyTrashed(): static;

    /**
     * Without trashed
     *
     * @return static
     */
    public function withoutTrashed(): static;

    /**
     * Order by column
     *
     * @param string $column
     * @param string $direction Default: asc
     *
     * @return static
     */
    public function orderBy(string $column, string $direction = 'asc'): static;

    /**
     * Create
     *
     * @param array $attributes
     *
     * @return TModel|null
     */
    public function create(array $attributes);

    /**
     * Find
     *
     * @param int $id
     *
     * @return TModel|null
     */
    public function find(int $id);

    /**
     * Update
     *
     * @param int   $id
     * @param array $attributes
     *
     * @return bool
     */
    public function update(int $id, array $attributes): bool;

    /**
     * Update or create
     *
     * @param array $array1
     * @param array $array2
     *
     * @return TModel|null
     */
    public function updateOrCreate(array $array1, array $array2);

    /**
     * Delete
     *
     * @param int $id
     *
     * @return bool
     */
    public function delete(int $id): bool;

    /**
     * Force Delete
     *
     * @param int $id
     *
     * @return bool
     */
    public function forceDelete(int $id): bool;
}
