<?php

use Illuminate\Foundation\Application;
use App\Http\Middleware\TouchSanctumToken;
use App\Http\Middleware\UseRequestHostForPublicStorage;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // cloudflared connects from this machine; trust its X-Forwarded-* headers (https, host).
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);
        $middleware->append(UseRequestHostForPublicStorage::class);

        $middleware->alias([
            'touch-token' => TouchSanctumToken::class,
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
