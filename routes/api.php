<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\V1\Auth;
use App\Http\Controllers\API\V1\World;
use App\Http\Controllers\API\V1\Security;
use App\Http\Controllers\API\V1\Management;
use Spatie\Health\Http\Controllers\SimpleHealthCheckController;

/**
 * API v1 Group
 *
 * @version v1
 */
Route::prefix('v1')->group(
    function () {
        Route::get('/', SimpleHealthCheckController::class);

        /**
         * Public Urls
         */
        Route::post('/login', Auth\LoginController::class);
        Route::post('/register', Auth\RegisterController::class);
        Route::post('/forgot-password', Auth\ForgotPasswordController::class);
        Route::post('/reset-password', Auth\ResetPasswordController::class);

        Route::prefix('users')->controller(Management\UserController::class)->group(
            function () {
                Route::get('/invitation/{user:email}', 'showInvitation');
            }
        );

        Route::prefix('world')->group(
            function () {
                Route::get('/countries', World\CountryController::class);
            }
        );

        Route::prefix('settings')->controller(Management\SettingController::class)->group(
            function () {
                Route::get('/', 'index');
            }
        );

        /**
         * Secure Urls
         * Authentication Routes
         * All users
         */
        Route::middleware(['auth:sanctum', 'touch-token'])->group(
            function () {
                Route::get('/me', Auth\MeController::class);
                Route::post('/me', [Auth\MeController::class, 'update']);
                Route::delete('/me', [Auth\MeController::class, 'destroy']);
                Route::post('/logout', Auth\LogoutController::class);

                Route::post('/verify', [Auth\VerifyEmailController::class, 'verify']);
                Route::post('/verify/resend', [Auth\VerifyEmailController::class, 'resend']);
            }
        );


        /**
         * Secure Urls
         * Security Routes
         * Only authenticated and verified users
         */
        Route::middleware(['auth:sanctum', 'touch-token', 'verified'])->group(
            function () {
                Route::apiResource('/roles', Security\RoleController::class);
                Route::apiResource('/permissions', Security\PermissionController::class);

                Route::prefix('activities')->controller(Security\ActivityController::class)->group(
                    function () {
                        Route::get('/', 'index');
                        Route::get('/{activity}', 'show');
                        Route::delete('/{activity}', 'destroy');
                    }
                );

                Route::prefix('personal-access-tokens')->controller(Security\PersonalAccessTokenController::class)->group(
                    function () {
                        Route::get('/', 'index');
                        Route::get('/{personal_access_token}', 'show')->withTrashed();
                        Route::patch('/{personal_access_token}', 'update')->withTrashed();
                        Route::delete('/{personal_access_token}', 'destroy');
                        Route::delete('/{personal_access_token}/force-delete', 'forceDestroy')->withTrashed();
                    }
                );
            }
        );

        /**
         * Secure Urls
         * Management Routes
         * Only authenticated and verified users
         */
        Route::middleware(['auth:sanctum', 'touch-token', 'verified'])->group(
            function () {
                Route::prefix('settings')->controller(Management\SettingController::class)->group(
                    function () {
                        Route::put('/', 'update');
                    }
                );

                Route::prefix('users')->controller(Management\UserController::class)->group(
                    function () {
                        Route::get('/', 'index');
                        Route::get('/{user}', 'show')->withTrashed();
                        Route::post('/', 'store');
                        Route::put('/{user}', 'update')->withTrashed();
                        Route::delete('/{user}', 'destroy');
                        Route::delete('/{user}/force-delete', 'forceDestroy')->withTrashed();
                        Route::post('invite', 'invite');
                    }
                );

                // Domain entities
                Route::apiResource('garages', Management\GarageController::class);

                Route::prefix('garages/{garage}')->group(function () {
                    Route::post('/person-roles', [Management\GaragePersonRoleController::class, 'store']);
                    Route::delete('/person-roles/{garage_person_role}', [Management\GaragePersonRoleController::class, 'destroy']);
                });

                Route::apiResource('associations', Management\AssociationController::class);

                Route::prefix('associations/{association}')->group(function () {
                    Route::post('/person-roles', [Management\AssociationPersonRoleController::class, 'store']);
                    Route::put('/person-roles/{association_person_role}', [Management\AssociationPersonRoleController::class, 'update']);
                    Route::delete('/person-roles/{association_person_role}', [Management\AssociationPersonRoleController::class, 'destroy']);
                });

                Route::apiResource('persons', Management\PersonController::class);

                Route::prefix('persons/{person}')->group(function () {
                    Route::post('/contacts', [Management\ContactController::class, 'store']);
                    Route::put('/contacts/{contact}', [Management\ContactController::class, 'update']);
                    Route::delete('/contacts/{contact}', [Management\ContactController::class, 'destroy']);
                });

                Route::get('domain-roles', [Management\DomainRoleController::class, 'index']);

            }
        );
    }
);
