<?php

namespace App\Repositories\Eloquent;

use App\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Class BaseRepositoryImplementation
 *
 * @template TModel of Model
 *
 * @implements EloquentRepository<TModel>
 *
 * @package App\Repositories\Eloquent
 */
class BaseRepositoryImplementation implements EloquentRepository
{
    /**
     * Model
     *
     * @var TModel
     */
    private $model;

    /**
     * Builder
     *
     * @var Builder<TModel>
     */
    private Builder $builder;

    /**
     * Init BaseRepositoryImplementation Constructor
     *
     * @psalm-param TModel $model
     */
    public function __construct($model)
    {
        $this->model = $model;
        $this->builder = $model->newQuery();
    }

    /**
     * Get builder
     *
     * @return Builder<TModel>
     */
    public function builder(): Builder
    {
        return $this->builder->newQuery();
    }

    /**
     * Get all
     *
     * @return Collection<array-key,TModel>
     */
    public function all(): Collection
    {
        $orderBy = $this->model->timestamps ? 'created_at' : 'id';
        $orderDir = $this->model->timestamps ? 'desc' : 'asc';

        return $this->orderBy($orderBy, $orderDir)->builder->get();
    }

    /**
     * Get paginated
     *
     * @param int|null $perPage Default: null
     *
     * @return LengthAwarePaginator<array-key,TModel>
     */
    public function paginate(?int $perPage = null): LengthAwarePaginator
    {
        return $this->builder->paginate($perPage);
    }

    /**
     * Search
     *
     * @param string|null $term Default: null
     *
     * @return static
     */
    public function search(?string $term = null): static
    {
        if ($this->builder->hasNamedScope('search')) {
            $this->builder->search($term);
        }

        return $this;
    }

    /**
     * Filter
     *
     * @param array $data Default: []
     *
     * @return static
     */
    public function filter(array $data = []): static
    {
        if ($this->builder->hasNamedScope('filter')) {
            $this->builder->filter($data);
        }

        return $this;
    }

    /**
     * Authorize
     *
     * @return static
     */
    public function authorized(): static
    {
        if ($this->builder->hasNamedScope('authorized')) {
            $this->builder->authorized();
        }

        return $this;
    }

    /**
     * With trashed
     *
     * @return static
     */
    public function withTrashed(): static
    {
        if ($this->builder->hasNamedScope('withTrashed')) {
            $this->builder->withTrashed();
        }

        return $this;
    }

    /**
     * Only trashed
     *
     * @return static
     */
    public function onlyTrashed(): static
    {
        if ($this->builder->hasNamedScope('onlyTrashed')) {
            $this->builder->onlyTrashed();
        }

        return $this;
    }

    /**
     * Without trashed
     *
     * @return static
     */
    public function withoutTrashed(): static
    {
        if ($this->builder->hasNamedScope('withoutTrashed')) {
            $this->builder->withoutTrashed();
        }

        return $this;
    }

    /**
     * Order by column
     *
     * @param string $column
     * @param string $direction Default: asc
     *
     * @return static
     */
    public function orderBy(string $column, string $direction = 'asc'): static
    {
        $this->builder->orderBy($column, $direction);

        return $this;
    }

    /**
     * Create
     *
     * @param array $attributes
     *
     * @return TModel|null
     */
    public function create(array $attributes)
    {
        return $this->model->create($attributes);
    }

    /**
     * Find
     *
     * @param int $id
     *
     * @return TModel|null
     */
    public function find(int $id)
    {
        return $this->model->find($id);
    }

    /**
     * Update
     *
     * @param int   $id
     * @param array $attributes
     *
     * @return bool
     */
    public function update(int $id, array $attributes): bool
    {
        $model = $this->model->find($id);

        return $model ? $model->update($attributes) : false;
    }

    /**
     * Update or create
     *
     * @param array $array1
     * @param array $array2
     *
     * @return TModel|null
     */
    public function updateOrCreate(array $array1, array $array2): Model
    {
        return $this->model->updateOrCreate($array1, $array2);
    }

    /**
     * Delete
     *
     * @param int $id
     *
     * @return bool
     */
    public function delete(int $id): bool
    {
        $model = $this->model->find($id);

        return $model ? $model->delete() : false;
    }

    /**
     * Force Delete
     *
     * @param int $id
     *
     * @return bool
     */
    public function forceDelete(int $id): bool
    {
        $builder = $this->builder->clone();

        $model = $builder->withTrashed()->find($id);

        if ($model && method_exists($model, 'forceDelete')) {
            return $model->forceDelete();
        }

        return false;
    }
}
