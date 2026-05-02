<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Gate;

class AccessApiDocs
{
    public function handle($request, Closure $next)
    {
        if (app()->environment('local')) {
            return $next($request);
        }

        $accessKey = config('scramble.access_key');
        $queryKey = $request->query('key');

        if ($accessKey && $queryKey && hash_equals((string) $accessKey, (string) $queryKey)) {
            return $next($request);
        }

        if (Gate::allows('viewApiDocs')) {
            return $next($request);
        }

        abort(403);
    }
}
