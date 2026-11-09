<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Builds public storage URLs (thumbnails, media) from the host the request came in on,
 * so the same instance works both locally and behind the Cloudflare Tunnel domain.
 */
class UseRequestHostForPublicStorage
{
    public function handle(Request $request, Closure $next): Response
    {
        config(['filesystems.disks.public.url' => $request->getSchemeAndHttpHost() . '/storage']);
        Storage::forgetDisk('public');

        return $next($request);
    }
}
