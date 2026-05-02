<?php

namespace App\Console\Commands\Sync;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Spatie\Permission\Exceptions\RoleDoesNotExist;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;

/**
 * Class Policy
 *
 * @package App\Console\Commands\Sync
 */
class Policy extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:policy
        {--R|rebase : Those roles & permissions not in config files will be deleted from the database.}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync roles & permissions from config to database';

    protected Role $roleRepository;
    protected Permission $permissionRepository;

    protected EloquentCollection $roles;
    protected EloquentCollection $permissions;

    protected Carbon $execution_time;
    protected int $indent = 2;
    protected string $listIcon = '- ';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $this->roleRepository = app(config('permission.models.role', Role::class));
        $this->permissionRepository = app(config('permission.models.permission', Permission::class));

        $this->call('config:cache');
        $this->newLine();
        $this->startExecutionTime();

        $this->roles = $this->syncGetRoles();
        $this->permissions = $this->syncGetPermissions();

        $this->syncPermissionRole();

        $this->warn('Reset permissions cache');
        $this->call('permission:cache-reset');
        $this->newLine();

        $this->info("Policy synchronization was executed in {$this->getExecutionTime()}ms");

        return 0;
    }

    /**
     * Start execution time
     *
     * @return void
     */
    protected function startExecutionTime(): void
    {
        $this->execution_time = now();
    }

    /**
     * Sync and get Roles
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    protected function syncGetRoles(): EloquentCollection
    {
        $roles = EloquentCollection::make();
        $configRoles = collect($this->records()->get('roles', []));
        $this->info('Sync Roles');

        $configRoles->each(function ($data, $role) use ($roles) {
            $validator = Validator::make($data->toArray(), [
                'display_name' => ['nullable', 'string'],
                'guard_name' => ['nullable', 'string'],
                'guards' => ['nullable', 'array', 'min:0'],
                'guards.*' => ['nullable', 'string'],
            ]);

            if ($validator->fails()) {
                $message = implode(', ', $validator->getMessageBag()->getMessageBag()->getMessages());
                $this->warn("Role: {$role} can't be created. Error:" . $message);

                return;
            }

            collect($data->get('guards', [$data->get('guard_name', User::GUARD_NAME)]))
                ->each(function ($guardName) use ($role, $data, $roles) {
                    try {
                        $record = $this->roleRepository->findByName($role, $guardName);
                    } catch (RoleDoesNotExist) {
                        $record = null;
                    }

                    if (! $data->get('name')) {
                        $data->put('name', $role);
                    }

                    if (! $data->get('display_name')) {
                        $data->put('display_name', $this->getSpatieDisplayName($role));
                    }

                    if (! $data->get('guard_name')) {
                        $data->put('guard_name', $guardName);
                    }

                    if (! $record) {
                        $record = $this->roleRepository->create(
                            $data->only(['name', 'display_name', 'guard_name'])->toArray()
                        );

                        $this->line($this->listIndent() . "[Created]: Role[{$guardName}]({$role})");
                    } elseif ($this->option('rebase')) {
                        $record->update(
                            $data->only(['display_name', 'guard_name'])->toArray()
                        );
                    }

                    $roles->push($record);
                });
        });

        if ($this->option('rebase')) {
            $this->roleRepository->newQuery()
                ->whereNotIn('name', $roles->pluck('name')->toArray())
                ->each(function ($role, $index) {
                    if (! $index) {
                        $this->newLine();
                    }

                    $this->warn($this->listIndent() . "[Deleted]: Role[{$role->guard_name}]({$role->name})");
                    $role->delete();
                });
        }

        $this->info("[Executed in {$this->getExecutionTime()}ms]: Sync Roles");
        $this->newLine();

        return $roles;
    }

    /**
     * Get records from policy config
     *
     * @return \Illuminate\Support\Collection
     */
    protected function records(): Collection
    {
        return $this->rCollect(config('policy'));
    }

    /**
     * Covert all arrays from given array in collection
     *
     * @param array $array
     *
     * @return \Illuminate\Support\Collection
     */
    protected function rCollect(array $array): Collection
    {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $value = $this->rCollect($value);
                $array[$key] = $value;
            }
        }

        return collect($array);
    }

    /**
     * Get Display Name from Name
     *
     * @param string $name
     *
     * @return string
     */
    protected function getSpatieDisplayName(string $name): string
    {
        $removeDashes = str_replace('-', ' ', $name);
        $removeUnderscores = str_replace('_', ' ', $removeDashes);

        return ucfirst($removeUnderscores);
    }

    /**
     * Get Indented list icon from given number
     *
     * @param int $indent
     *
     * @return string
     */
    protected function listIndent(int $indent = 1): string
    {
        return $this->indent($indent) . $this->listIcon;
    }

    /**
     * Get Indentation from given number
     *
     * @param int $repeat
     *
     * @return string
     */
    protected function indent(int $repeat = 1): string
    {
        return str_repeat(str_repeat(' ', $this->indent ?? 2), $repeat);
    }

    /**
     * Get Execution Time
     *
     * @return int
     */
    protected function getExecutionTime(): int
    {
        return now()->diffInMilliseconds($this->execution_time);
    }

    /**
     * Sync and get Permissions
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    protected function syncGetPermissions(): EloquentCollection
    {
        $permissions = EloquentCollection::make();
        $configPermissions = collect($this->records()->get('permissions', []));
        $this->info('Sync Permissions');

        $configPermissions->each(function ($resourcePermissions, $resource) use ($permissions) {
            $resourcePermissions->each(function ($data, $permission) use ($resource, $permissions) {
                if (is_array($data)) {
                    $validator = Validator::make($data->toArray(), [
                        'display_name' => ['nullable', 'string'],
                        'guards' => ['nullable', 'array', 'min:0'],
                        'guards.*' => ['nullable', 'string'],
                    ]);

                    if ($validator->fails()) {
                        $message = implode(', ', $validator->getMessageBag()->getMessageBag()->getMessages());
                        $this->warn("Permission: {$permission} can't be created. Error:" . $message);

                        return;
                    }
                }

                if (is_string($data)) {
                    $permission = $data;
                    $data = collect();
                }

                $permission = "{$this->getAbilityFromAbbreviation($permission)}-{$resource}";

                collect($data->get('guards', [$data->get('guard_name', User::GUARD_NAME)]))
                    ->each(function ($guardName) use ($permission, $data, $permissions) {
                        try {
                            $record = $this->permissionRepository->findByName($permission, $guardName);
                        } catch (PermissionDoesNotExist) {
                            $record = null;
                        }

                        if (! $data->get('name')) {
                            $data->put('name', $permission);
                        }

                        if (! $data->get('display_name')) {
                            $data->put('display_name', $this->getSpatieDisplayName($permission));
                        }

                        if (! $data->get('guard_name')) {
                            $data->put('guard_name', $guardName);
                        }

                        if (! $record) {
                            $record = $this->permissionRepository->create(
                                $data->only(['name', 'display_name', 'guard_name'])->toArray()
                            );

                            $this->line($this->listIndent() . "[Created]: Permission[{$guardName}]({$permission})");
                        } elseif ($this->option('rebase')) {
                            $record->update(
                                $data->only(['display_name', 'guard_name'])->toArray()
                            );
                        }

                        $permissions->push($record);
                    });
            });
        });

        if ($this->option('rebase')) {
            $this->permissionRepository->newQuery()
                ->whereNotIn('name', $permissions->pluck('name')->toArray())
                ->each(function ($permission, $index) {
                    if (! $index) {
                        $this->newLine();
                    }
                    $this->warn($this->listIndent() .
                        "[Deleted]: Permission[{$permission->guard_name}]({$permission->name})");
                    $permission->delete();
                });
        }
        $this->info("[Executed in {$this->getExecutionTime()}ms]: Sync Permissions");
        $this->newLine();

        return $permissions;
    }

    /**
     * Function Description
     *
     * @param string $abbreviation
     *
     * @return string
     */
    protected function getAbilityFromAbbreviation(string $abbreviation): string
    {
        return strval(config("policy.abbreviations.{$abbreviation}") ?? $abbreviation);
    }

    /**
     * Sync Role's Permissions
     *
     * @return void
     */
    protected function syncPermissionRole(): void
    {
        $configPermissionRole = collect($this->records()->get('permission_role'));
        $this->info('Sync Role\'s Permissions');

        $configPermissionRole->each(
            fn ($roles, $guardName) => $roles->each(function ($resources, $role) use ($guardName) {
                $role = $this->roles->where('name', $role)->where('guard_name', $guardName)->first();

                if (! $role) {
                    return;
                }

                $resources = $resources
                    ->map(fn ($permissions, $resource) => $permissions->map(function ($permission) use ($resource) {
                        return "{$this->getAbilityFromAbbreviation($permission)}-{$resource}";
                    }))
                    ->flatten()
                    ->map(fn ($item) => $this->permissions->where('name', $item)->where(
                        'guard_name',
                        $guardName
                    )->first())
                    ->reject(fn ($item) => is_null($item))
                    ->pluck('id')
                    ->toArray();

                $synced_permissions = $role->permissions()->pluck('id')->toArray();

                $unsynced_permissions = $this->permissionRepository->newQuery()->whereIn(
                    'id',
                    collect($resources)->diff($synced_permissions)
                );

                $should_unsync_permissions = $this->permissionRepository->newQuery()->whereIn(
                    'id',
                    collect($synced_permissions)->diff($resources)
                );

                if ($unsynced_permissions->count() || $should_unsync_permissions->count()) {
                    $this->info($this->listIndent() . "Sync {$role->name}'s Permissions");

                    if ($unsynced_permissions->count()) {
                        $unsynced_permissions->each(function ($permission) {
                            $this->line($this->listIndent(2) .
                                "[Synced]: Permission[{$permission->guard_name}]({$permission->name})");
                        });
                    }
                }

                $should_unsync_permissions->each(function ($permission) {
                    $this->warn($this->listIndent(2) .
                        "[Unsynced]: Permission[{$permission->guard_name}]({$permission->name})");
                });

                if ($unsynced_permissions->count() || $should_unsync_permissions->count()) {
                    $role->permissions()->sync($resources);
                    $this->info($this->listIndent() .
                        "[Executed in {$this->getExecutionTime()}ms]: Sync {$role->name}'s Permissions");
                }
            })
        );

        $this->info("[Executed in {$this->getExecutionTime()}ms]: Sync Role's Permissions");
        $this->newLine();
    }

    /**
     * Get Name from Display Name
     *
     * @param string $displayName
     *
     * @return string
     */
    protected function getSpatieName(string $displayName): string
    {
        $addDashes = str_replace(' ', '-', $displayName);

        return strtolower($addDashes);
    }
}
