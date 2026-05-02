<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Stevebauman\Location\Facades\Location;
use Symfony\Component\HttpFoundation\Response;

class TouchSanctumToken
{
    /**
     * Handle an incoming request.
     *
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     */
    public function handle($request, Closure $next)
    {
        $response = $next($request);

        $user = $request->user();                 // sanctum user
        $token = $user?->currentAccessToken();     // the PAT used for this call

        if ($token) {
            $ip = $request->ip();
            $geo = Location::get($ip);

            if (is_bool($geo)) {
                $geo = null;
            }

            $token->forceFill([
                'last_ip' => $ip,
                'last_country_code' => $geo?->countryCode,
                'last_country' => $geo?->countryName,
                'user_agent' => Str::limit((string) $request->userAgent(), 255),
                'last_used_at' => now(),
            ])->save();
        }

        return $response;
    }
}
