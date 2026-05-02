<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Str;

class TouchSanctumToken
{
    public function handle($request, Closure $next)
    {
        $response = $next($request);

        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->forceFill([
                'last_ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 255),
                'last_used_at' => now(),
            ])->save();
        }

        return $response;
    }
}
