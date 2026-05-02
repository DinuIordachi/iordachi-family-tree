<?php

namespace App\Providers;

use App\Policies;
use App\Models;
use Laravel\Sanctum\Sanctum;
use Dedoc\Scramble\Scramble;
use App\Enums\PermissionsEnum;
use Spatie\Health\Facades\Health;
use Illuminate\Support\Facades\Gate;
use App\Repositories as Repositories;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Broadcast;
use Spatie\Health\Checks\Checks\PingCheck;
use Spatie\Health\Checks\Checks\RedisCheck;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Spatie\Health\Checks\Checks\DatabaseCheck;
use App\Repositories\Eloquent as ERepositories;
use Spatie\Health\Checks\Checks\DebugModeCheck;
use Spatie\Health\Checks\Checks\UsedDiskSpaceCheck;
use Dedoc\Scramble\Support\Generator\SecurityScheme;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Repository binds
     *
     * @var list<string>
     */
    private array $repositories = [
        Repositories\UserRepository::class => ERepositories\UserRepositoryImplementation::class,
        Repositories\RoleRepository::class => ERepositories\RoleRepositoryImplementation::class,
        Repositories\PermissionRepository::class => ERepositories\PermissionRepositoryImplementation::class,
        Repositories\ActivityRepository::class => ERepositories\ActivityRepositoryImplementation::class,
        Repositories\PersonalAccessTokenRepository::class => ERepositories\PersonalAccessTokenRepositoryImplementation::class,
        Repositories\CountryRepository::class => ERepositories\CountryRepositoryImplementation::class,
        Repositories\AssociationRepository::class => ERepositories\AssociationRepositoryImplementation::class,
        Repositories\PersonRepository::class => ERepositories\PersonRepositoryImplementation::class,
        Repositories\ContactRepository::class => ERepositories\ContactRepositoryImplementation::class,
        Repositories\DomainRoleRepository::class => ERepositories\DomainRoleRepositoryImplementation::class,
        Repositories\GarageRepository::class => ERepositories\GarageRepositoryImplementation::class,
        Repositories\GaragePersonRoleRepository::class => ERepositories\GaragePersonRoleRepositoryImplementation::class,
        Repositories\AssociationPersonRoleRepository::class => ERepositories\AssociationPersonRoleRepositoryImplementation::class,
    ];

    /**
     * Policies
     *
     * @var list<string>
     */
    private array $policies = [
        Models\User::class => Policies\UserPolicy::class,
        Models\Role::class => Policies\RolePolicy::class,
        Models\Permission::class => Policies\PermissionPolicy::class,
        Models\Activity::class => Policies\ActivityPolicy::class,
        Models\PersonalAccessToken::class => Policies\PersonalAccessTokenPolicy::class,
        Models\Garage::class => Policies\GaragePolicy::class,
        Models\Association::class => Policies\AssociationPolicy::class,
        Models\Person::class => Policies\PersonPolicy::class,
        Models\Contact::class => Policies\ContactPolicy::class,
        Models\DomainRole::class => Policies\DomainRolePolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->registerRepositories();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
        $this->registerHealthChecks();
        $this->bootAuthorization();
        $this->bootApiDocs();
    }

    /**
     * Register health check tests
     *
     * @return void
     */
    private function registerHealthChecks(): void
    {
        Health::checks([
            DebugModeCheck::new()->name('Debug')->unless(app()->environment('local')),
            RedisCheck::new()->name('Cache'),
            UsedDiskSpaceCheck::new()->name('Disk'),
            DatabaseCheck::new()->name('Database'),
            PingCheck::new()->name(config('app.front_end_url', ''))->url(config('app.front_end_url', '')),
        ]);
    }

    /**
     * Boot Authorization routes and
     * set default values
     *
     * @return void
     */
    private function bootAuthorization(): void
    {
        Broadcast::routes(['middleware' => ['auth:sanctum']]);
        Sanctum::usePersonalAccessTokenModel(Models\PersonalAccessToken::class);
    }

    /**
     * Boot api docs
     *
     * @return void
     */
    private function bootApiDocs(): void
    {
        Scramble::registerApi('v1', [
            'api_path' => 'api/v1',
        ]);

        Scramble::configure()
            ->withDocumentTransformers(function (OpenApi $openApi) {
                $openApi->secure(
                    SecurityScheme::http('bearer')
                );
            });
    }

    /**
     * Register Policies
     *
     * @return void
     */
    private function registerPolicies(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        Gate::before(function (?Models\User $user, ?string $ability = null, array $arguments = []) {
            $modelClass = null;
            if (is_array($arguments) && isset($arguments[0])) {
                if ($arguments[0] instanceof Model) {
                    $modelClass = $arguments[0]::class;
                } elseif (is_string($arguments[0])) {
                    $modelClass = $arguments[0];
                }
            }

            if (! is_null($modelClass) && array_search($modelClass, array_keys(Gate::policies())) !== false) {
                return null;
            }

            if (! $user) {
                return false;
            }

            if (! $user->hasVerifiedEmail() || $user->isBlocked()) {
                return false;
            }

            if (in_array($ability, PermissionsEnum::array(), true)) {
                return $user->hasPermissionTo($ability);
            }

            return null;
        });
    }

    /**
     * Register Repositories
     *
     * @return void
     */
    private function registerRepositories(): void
    {
        foreach ($this->repositories as $alias => $implementation) {
            $this->app->bind($alias, $implementation);
        }
    }
}
