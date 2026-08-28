<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\V1\Auth;
use App\Http\Controllers\API\V1\Security;
use App\Http\Controllers\API\V1\Management;
use App\Http\Controllers\API\V1\FamilyTree;
use Spatie\Health\Http\Controllers\SimpleHealthCheckController;

/**
 * API v1
 *
 * @version v1
 */
Route::prefix('v1')->group(function () {
    Route::get('/', SimpleHealthCheckController::class);

    /*
     * Public routes
     */
    Route::post('/login', Auth\LoginController::class);
    Route::post('/register', Auth\RegisterController::class);
    Route::post('/forgot-password', Auth\ForgotPasswordController::class);
    Route::post('/reset-password', Auth\ResetPasswordController::class);

    /*
     * Public family tree (read-only).
     */
    Route::prefix('family-tree')->controller(FamilyTree\FamilyTreeController::class)->group(function () {
        Route::get('/', 'index');
        Route::get('/{family_member}', 'show')->withTrashed();
    });

    /*
     * Authenticated routes (no email verification required)
     */
    Route::middleware(['auth:sanctum', 'touch-token'])->group(function () {
        Route::get('/me', Auth\MeController::class);
        Route::post('/me', [Auth\MeController::class, 'update']);
        Route::delete('/me', [Auth\MeController::class, 'destroy']);
        Route::post('/logout', Auth\LogoutController::class);

        Route::post('/verify', [Auth\VerifyEmailController::class, 'verify']);
        Route::post('/verify/resend', [Auth\VerifyEmailController::class, 'resend']);
    });

    /*
     * Authenticated + verified routes
     */
    Route::middleware(['auth:sanctum', 'touch-token', 'verified'])->group(function () {
        Route::apiResource('roles', Security\RoleController::class);
        Route::apiResource('permissions', Security\PermissionController::class);

        Route::prefix('activities')->controller(Security\ActivityController::class)->group(function () {
            Route::get('/', 'index');
            Route::get('/{activity}', 'show');
            Route::delete('/{activity}', 'destroy');
        });

        Route::prefix('personal-access-tokens')->controller(Security\PersonalAccessTokenController::class)->group(function () {
            Route::get('/', 'index');
            Route::get('/{personal_access_token}', 'show')->withTrashed();
            Route::patch('/{personal_access_token}', 'update')->withTrashed();
            Route::delete('/{personal_access_token}', 'destroy');
            Route::delete('/{personal_access_token}/force-delete', 'forceDestroy')->withTrashed();
        });

        Route::prefix('users')->controller(Management\UserController::class)->group(function () {
            Route::get('/', 'index');
            Route::post('/', 'store');
            Route::post('/invite', 'invite');
            Route::get('/{user}', 'show')->withTrashed();
            Route::put('/{user}', 'update')->withTrashed();
            Route::delete('/{user}', 'destroy');
            Route::delete('/{user}/force-delete', 'forceDestroy')->withTrashed();
        });

        /*
         * Family tree writes (protected).
         */
        Route::prefix('family-tree')->controller(FamilyTree\FamilyTreeController::class)->group(function () {
            Route::post('/', 'store');
            Route::put('/{family_member}', 'update');
            Route::delete('/{family_member}', 'destroy');
            Route::delete('/{family_member}/force-delete', 'forceDestroy')->withTrashed();
        });

        Route::prefix('family-tree/{family_member}')->controller(FamilyTree\FamilyMemberMediaController::class)->group(function () {
            Route::post('/thumbnail', 'storeThumbnail');
            Route::delete('/thumbnail', 'destroyThumbnail');
            Route::post('/media', 'storeMedia');
            Route::delete('/media/{media}', 'destroyMedia');
        });
    });
});
