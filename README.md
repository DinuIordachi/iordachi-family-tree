<p align="center"><a href="https://api.aai.md" target="_blank"><img src="https://github.com/user-attachments/assets/334059e6-432c-402c-b30f-318b062a1d2d" width="400" alt="Laravel Logo"></a></p>

<br>
<br>

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment](#environment)
- [Running Locally](#running-locally)
- [API Documentation](#api-documentation)
- [Auth & Security](#auth--security)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

---

## Features
- **Laravel 12** (PHP 8.2+)
- **Sanctum** authentication (SPA cookies & Personal Access Tokens)
- Granular **roles/permissions**
- **Activity logging** for key events (login, etc.)
- **CORS** for multi-app setup (web/admin/account)
- **OpenAPI v3** docs from a single spec file

---

## Requirements
- PHP **8.2+** (extensions: `bcmath`, `ctype`, `fileinfo`, `json`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`)
- PHP extension: `imagick` (required for PDF/Office thumbnail previews)
- Composer **2.x**
- MySQL 8 / MariaDB 10.5+ (or PostgreSQL)
- Redis (optional; queues/cache)
- LibreOffice (`soffice`) and Ghostscript (required for Office/PDF preview generation)
- Node 18+ (optional; if compiling assets)
- Nginx/Apache with HTTPS (prod)

---

## Quick Start
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

---

## Environment
Common `.env` keys (edit to your setup):

```env
APP_NAME="Asociatia Auditorilor Interni API"
APP_ENV=local
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:4200
API_VERSION=v1

# API Docs access key (any random string; rotate anytime)
SCRAMBLE_ACCESS_KEY=change_me_to_a_random_long_string

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aai
DB_USERNAME=root
DB_PASSWORD=secret

MAIL_MAILER=log
MAIL_SCHEME=null
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

---

## Running Locally
```bash
php artisan serve
# queues (if used)
php artisan queue:work
# optional: queue file preview generation for existing files
php artisan files:generate-previews
```

---

## API Documentation

OpenAPI viewer: **dedoc/scramble**.

- **Production docs (key-gated):**  
  `https://api.aai.md/docs/api?key=[SCRAMBLE_ACCESS_KEY]`
- **Local example:**  
  `http://localhost:8000/docs/api`

Update `SCRAMBLE_ACCESS_KEY` in `.env` to any random string. Rotate by changing the value and redeploying.

**Recommended `servers` in the spec:**
```json
{
  "servers": [
    { "url": "http://localhost:8000" },
    { "url": "https://api.aai.md" }
  ]
}
```

> Note: The query-key is **access gating**, not strong auth. In production, consider also adding auth/IP allow-list if the docs shouldn’t be public.

---

## Auth & Security

**Login (example)**
```
POST /api/v1/login
{
  "email": "user@example.com",
  "password": "secret123",
  "remember": true
}
```

Use token in requests:
```
Authorization: Bearer <token>
```

- Prefer **Bearer (Personal Access Token)** for Swagger “Authorize”. Cookie auth from Swagger often fails due to same-site/CORS.

---

## Testing
```bash
php artisan test
```
Optional: **Pint** for style → `./vendor/bin/pint`

---

## Deployment

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

- Queues via Supervisor/Systemd; cron for `schedule:run`.
- Publish/validate `resources/swagger/openapi.json` as part of your deploy.
- Ensure `/docs/api` requires `?key=${SCRAMBLE_ACCESS_KEY}` in production.

---

## License
Proprietary – © Asociatia Auditorilor Interni din Republica Moldova. All rights reserved.
