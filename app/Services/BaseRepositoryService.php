<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use App\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * Class BaseService
 *
 * @template TRepository of EloquentRepository
 * @template TModel of Model
 *
 * @package App\Services
 */
abstract class BaseRepositoryService extends BaseService
{
    /** @var TRepository $repository */
    protected $repository;

    /**
     * Get all entities
     *
     * @return Collection<array-key, TModel>
     */
    public function getAll(): Collection
    {
        return $this->repository->all();
    }

    /**
     * Get searched, filtered, ordered and authorized entities
     *
     * @param string|null $term
     * @param string|null $order_by
     * @param string|null $order_dir
     * @param array|null  $filters
     *
     * @return EloquentRepository<TModel>
     */
    public function searchAuthorized(
        ?string $term = null,
        ?string $order_by = 'created_at',
        ?string $order_dir = 'asc',
        ?array $filters = [],
    ) {
        return $this->repository
            ->search($term)
            ->filter($filters)
            ->authorized()
            ->orderBy($order_by, $order_dir);
    }

    /**
     * Find a model
     *
     * @param int $id
     *
     * @return TModel|null
     */
    public function find(int $id)
    {
        return $this->repository->find($id);
    }

    /**
     * Create a model
     *
     * @param array $data
     *
     * @return TModel|null
     */
    public function create(array $data)
    {
        return $this->repository->create($data);
    }

    /**
     * Update a model
     *
     * @param TModel $model
     * @param array  $data
     *
     * @return bool
     */
    public function update($model, array $data): bool
    {
        return $this->repository->update($model->id, $data);
    }

    /**
     * Delete a model
     *
     * @param TModel $model
     *
     * @return bool
     */
    public function delete($model): bool
    {
        return $this->repository->delete($model->id);
    }

    /**
     * Force delete a model
     *
     * @param TModel $model
     *
     * @return bool
     */
    public function forceDelete($model): bool
    {
        return $this->repository->forceDelete($model->id);
    }
}