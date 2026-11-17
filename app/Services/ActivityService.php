<?php

namespace App\Services;

use App\Models\User;
use App\Models\Activity;
use App\Repositories\ActivityRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Class ActivityService
 *
 * @template-extends BaseRepositoryService<ActivityRepository, \App\Models\Activity>
 *
 * @package App\Services
 */
class ActivityService extends BaseRepositoryService
{
    public function __construct()
    {
        $this->repository = app(ActivityRepository::class);
    }

    /**
     * Paginated, authorized activity report. Builds a fresh query on every
     * call (the shared repository builder accumulates state across calls).
     *
     * @param array<string, mixed> $filters log_name, event, causer_id, subject_type, date_from, date_to
     */
    public function report(
        ?string $term,
        string $orderBy = 'created_at',
        string $orderDirection = 'desc',
        array $filters = [],
        int $pageSize = 20,
    ): LengthAwarePaginator {
        return Activity::query()
            ->search($term)
            ->filter($filters)
            ->authorized()
            ->with(['causer', 'subject'])
            ->orderBy($orderBy, $orderDirection)
            ->orderByDesc('id')
            ->paginate($pageSize);
    }

    /**
     * Distinct values for the report's dropdowns.
     *
     * @return array{events: list<string>, logNames: list<string>, subjectTypes: list<string>, causers: list<array{id:int,name:string,email:string}>}
     */
    public function filterOptions(): array
    {
        $distinct = fn (string $column) => Activity::query()
            ->whereNotNull($column)
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->values()
            ->all();

        $causers = User::withTrashed()
            ->whereIn('id', Activity::query()->where('causer_type', User::class)->select('causer_id'))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->activityLabel(),
                'email' => $user->email,
            ])
            ->values()
            ->all();

        return [
            'events' => $distinct('event'),
            'logNames' => $distinct('log_name'),
            'subjectTypes' => array_keys(Activity::SUBJECT_TYPES),
            'causers' => $causers,
        ];
    }
}
