{{-- resources/views/errors/503.blade.php --}}
    <!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name') }} – Maintenance</title>
    {{-- Optional: auto-refresh every 30s --}}
    <meta http-equiv="refresh" content="30">

    <style>
        :root {
            --bg: #f7f9fc; /* light site background */
            --card: #ffffff; /* card surface */
            --text: #0f172a; /* slate-900 */
            --muted: #475569; /* slate-600 */
            --accent: #4D487C; /* primary */
            --accent-600: #3E3A66; /* darker primary */
            --secondary: #F7DD72; /* secondary */
            --border: rgba(2, 6, 23, .08);
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            height: 100%;
        }

        body {
            margin: 0;
            background: radial-gradient(900px 380px at 0% -10%, rgba(77, 72, 124, .10), transparent 60%),
            radial-gradient(900px 380px at 120% 110%, rgba(247, 221, 114, .14), transparent 60%),
            var(--bg);
            color: var(--text);
            font: 16px/1.6 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
            display: grid;
            place-items: center;
            padding: 24px;
        }

        .card {
            width: 100%;
            max-width: 780px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 36px 32px;
            box-shadow: 0 12px 30px rgba(15, 23, 42, .06);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 8px;
        }

        .brand img {
            height: 50px;
            width: auto;
        }

        h1 {
            margin: 4px 0 8px 0;
            font-weight: 700;
            font-size: clamp(22px, 3.2vw, 32px);
            letter-spacing: .2px;
        }

        p {
            margin: 0 0 14px 0;
            color: var(--muted);
        }

        .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            letter-spacing: .3px;
            font-weight: 600;
            background: rgba(247, 221, 114, .18);
            color: var(--accent);
            border: 1px solid rgba(247, 221, 114, .55);
            margin-bottom: 8px;
        }

        .row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 30px;
        }

        .btn, .link {
            appearance: none;
            border: 0;
            cursor: pointer;
            text-decoration: none;
            padding: 6px 20px;
            border-radius: 6px;
            font-weight: 700;
            transition: transform .06s ease, box-shadow .2s ease, background-color .2s ease, color .2s ease;
        }

        .btn {
            background: var(--accent);
            color: #ffffff;
            box-shadow: 0 10px 20px rgba(77, 72, 124, .20);
        }

        .btn:hover {
            background: var(--accent-600);
            box-shadow: 0 12px 26px rgba(77, 72, 124, .28);
        }

        .btn:active {
            transform: translateY(1px);
        }

        .link {
            color: var(--accent);
            background: #fff;
            border: 1px solid var(--border);
        }

        .link:hover {
            background: rgba(77, 72, 124, .06);
        }

        .meta {
            margin-top: 18px;
            font-size: 12px;
            color: var(--muted);
        }

        .count {
            font-variant-numeric: tabular-nums;
            color: var(--text);
        }
    </style>
</head>
<body>
<main class="card" @isset($retryAfter) data-retry-after="{{ (int) $retryAfter }}" @endisset>
    <div class="brand">
        <img src="{{asset('/images/logo/logo-v1.svg')}}" alt="Asociatia Auditorilor Interni din Republica Moldova"
             style="max-width:100%;height:50px;margin-bottom:1rem">
        <span class="pill">Service temporary unavailable</span>
    </div>

    <h1>{{ config('app.name') }} is down for maintenance</h1>
    <p>We’re applying updates to keep things fast, secure, and shiny ✨. Thanks for your patience.</p>

    @isset($retryAfter)
        <p>Estimated time until we’re back: <strong class="count" id="eta">~{{ (int) $retryAfter }}</strong> seconds.
        </p>
    @endisset

    <div class="row">
        <button class="btn" onclick="location.reload()">Retry now</button>
        <a class="link" href="mailto:{{ config('mail.from.address') }}">Contact support</a>
        {{-- If you started maintenance with a secret (php artisan down --secret="my-secret"),
             you can add a direct link for admins:
             <a class="link" href="{{ url(env('MAINTENANCE_SECRET', 'my-secret')) }}">Admin access</a>
        --}}
    </div>
</main>

<script>
    // Optional countdown if $retryAfter (seconds) was provided via `php artisan down --retry=SECONDS --render="errors::503"`
    (function () {
        var root = document.querySelector('main[data-retry-after]');
        if (!root) return;
        var seconds = parseInt(root.getAttribute('data-retry-after'), 10) || 0;
        var el = document.getElementById('eta');
        if (!el || !seconds) return;

        function tick() {
            seconds = Math.max(0, seconds - 1);
            el.textContent = '~' + seconds;
            if (seconds > 0) setTimeout(tick, 1000);
        }

        tick();
    })();
</script>
</body>
</html>
