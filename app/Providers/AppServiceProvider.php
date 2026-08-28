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
     * Repository bindings.
     *
     * @var array<class-string, class-string>
     */
    private array $repositories = [
        Repositories\UserRepository::class => ERepositories\UserRepositoryImplementation::class,
        Repositories\RoleRepository::class => ERepositories\RoleRepositoryImplementation::class,
        Repositories\PermissionRepository::class => ERepositories\PermissionRepositoryImplementation::class,
        Repositories\ActivityRepository::class => ERepositories\ActivityRepositoryImplementation::class,
        Repositories\PersonalAccessTokenRepository::class => ERepositories\PersonalAccessTokenRepositoryImplementation::class,
        Repositories\FamilyMemberRepository::class => ERepositories\FamilyMemberRepositoryImplementation::class,
    ];

    /**
     * Model → Policy bindings.
     *
     * @var array<class-string, class-string>
     */
    private array $policies = [
        Models\User::class => Policies\UserPolicy::class,
        Models\Role::class => Policies\RolePolicy::class,
        Models\Permission::class => Policies\PermissionPolicy::class,
        Models\Activity::class => Policies\ActivityPolicy::class,
        Models\PersonalAccessToken::class => Policies\PersonalAccessTokenPolicy::class,
        Models\FamilyMember::class => Policies\FamilyMemberPolicy::class,
    ];

    public function register(): void
    {
        foreach ($this->repositories as $alias => $implementation) {
            $this->app->bind($alias, $implementation);
        }
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->registerHealthChecks();
        $this->bootAuthorization();
        $this->bootApiDocs();
    }

    private function registerHealthChecks(): void
    {
        Health::checks([
            DebugModeCheck::new()->name('Debug')->unless(app()->environment('local')),
            RedisCheck::new()->name('Cache'),
            UsedDiskSpaceCheck::new()->name('Disk'),
            DatabaseCheck::new()->name('Database'),
        ]);
    }

    private function bootAuthorization(): void
    {
        Broadcast::routes(['middleware' => ['auth:sanctum']]);
        Sanctum::usePersonalAccessTokenModel(Models\PersonalAccessToken::class);
    }

    private function bootApiDocs(): void
    {
        Scramble::registerApi('v1', ['api_path' => 'api/v1']);

        Scramble::configure()
            ->withDocumentTransformers(function (OpenApi $openApi) {
                $openApi->secure(SecurityScheme::http('bearer'));
            });
    }

    private function registerPolicies(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        Gate::before(function (?Models\User $user, ?string $ability = null, array $arguments = []) {
            $modelClass = null;
            if (isset($arguments[0])) {
                if ($arguments[0] instanceof Model) {
                    $modelClass = $arguments[0]::class;
                } elseif (is_string($arguments[0])) {
                    $modelClass = $arguments[0];
                }
            }

            if ($modelClass !== null && array_key_exists($modelClass, Gate::policies())) {
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
}
