# Admin Activity Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin-only, searchable, filterable activity report (with field-level before/after changes and highlighted matches) plus a recent-activity card on the dashboard.

**Architecture:** spatie/laravel-activitylog's `LogsActivity` trait records model changes automatically; the existing `/api/v1/activities` endpoint gains search across causer/properties, filters, admin-only policy and a normalized `changes` array. The Angular client adds an `/activity` page (lazy PrimeNG table + highlight pipe) and a dashboard card.

**Tech Stack:** Laravel 12, spatie/laravel-activitylog 4, Sanctum, PHPUnit (sqlite :memory:); Angular 21, PrimeNG 21, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-17-admin-activity-report-design.md`

## Global Constraints

- Only `RolesEnum::ADMIN` may list, view or delete activities — the activity permissions no longer grant access.
- `password`, `remember_token`, `email_code`, `email_code_expires_at` never appear in activity properties.
- Exactly one activity entry per user action (no automatic + manual duplicates).
- API params are camelCase (`pageSize`, `orderBy`, `orderDirection`, `term`, `causerId`, `event`, `logName`, `subjectType`, `dateFrom`, `dateTo`), response keys camelCase.
- Highlighting is case-insensitive, HTML-escaped, and treats the term literally (no regex injection).

## Review Focus

1. Search term with SQL `%`/`_` or quotes, or regex chars like `(` `.` `*` → literal match, no error. (Tests in Task 3, Task 5.)
2. Activity whose subject was deleted/force-deleted, or causer is null (system/console) → row still renders with "#id (deleted)" / "System". (Task 4 test.)
3. Update that changes nothing (same values submitted) → no activity row created. (Task 1 test.)
4. Search combined with a filter → filter still applies (today's `orWhere` chain leaks). (Task 3 test.)
5. Non-admin hitting `/activity` directly in the browser → redirected to `/dashboard`, no API 403 toast storm. (Task 6 check.)

---

### Task 1: Automatic change tracking on models

**Files:**
- Modify: `app/Models/FamilyMember.php`, `app/Models/User.php`, `app/Models/Role.php`
- Modify: `config/activitylog.php` (`activity_model` → `\App\Models\Activity::class`)
- Modify: `app/Http/Controllers/API/V1/FamilyTree/FamilyTreeController.php`, `app/Http/Controllers/API/V1/Management/UserController.php`, `app/Http/Controllers/API/V1/Security/RoleController.php`, `app/Http/Controllers/API/V1/Auth/MeController.php` — remove the `activity()` calls for create/update/delete(soft)/restore of these three models. Keep force-delete, invite, login/logout, verify, reset, media, token, permission entries.
- Test: `tests/Feature/ActivityChangeTrackingTest.php`

**Interfaces:**
- Produces: activities with `log_name` ∈ {`family-member`,`user`,`role`}, `event` ∈ {`created`,`updated`,`deleted`,`restored`}, `properties.attributes` / `properties.old` holding only dirty fillable fields; relationship activity `event = 'relationships-updated'`, `log_name = 'family-member'`, `properties = {old: {parents:[{id,name}],spouses:[…],children:[…]}, attributes: {…same keys…}}`.
- Produces: `FamilyMember::fullName(): string` if not already present (used for descriptions/labels).

- [ ] **Step 1: Write failing tests** (`ActivityChangeTrackingTest`, `RefreshDatabase`, admin token via a new `TestCase::adminToken(): string` helper that seeds roles and assigns `RolesEnum::ADMIN`):
  - `test_updating_a_member_logs_only_changed_fields`: create member `first_name=Ion,last_name=Iordachi`; PUT `/api/v1/family-tree/{id}` with `first_name=Ioan` → exactly one activity with `event=updated`, `properties.old == ['first_name'=>'Ion']`, `properties.attributes == ['first_name'=>'Ioan']`.
  - `test_saving_without_changes_logs_nothing`: PUT same values → zero `updated` activities.
  - `test_creating_a_member_logs_once`: POST → `Activity::where('subject_id',$id)->count() === 1`, event `created`.
  - `test_user_password_is_never_logged`: update a user's password + first_name → no activity `properties` JSON contains `password`, `email_code` or the hash.
  - `test_relationship_change_logs_one_entry`: PUT member with new `parent_ids=[$p->id]` → one `relationships-updated` with `attributes.parents[0].id == $p->id`, `old.parents == []`; PUT same again → none added.
- [ ] **Step 2: Run** `php artisan test --filter=ActivityChangeTrackingTest` → FAIL.
- [ ] **Step 3: Implement.** Each model: `use LogsActivity;` and `getActivitylogOptions(): LogOptions` returning `LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('<name>')->setDescriptionForEvent(fn (string $e) => "<Label> {$this->label} was {$e}")`. User adds `->logExcept(['password','email_code','email_code_expires_at','remember_token'])`. Relationship log: in `FamilyTreeController` store/update, snapshot `parents/spouses/children` (id + full name) before `syncRelationships`, compare after, log only when different.
- [ ] **Step 4: Run** the test file → PASS; run `php artisan test` → all green.
- [ ] **Step 5: Commit** `feat: track model changes in the activity log automatically`.

### Task 2: Admin-only access

**Files:**
- Modify: `app/Policies/ActivityPolicy.php` (`viewAny`, `view`, `delete` → `return $user->isAdmin();`)
- Modify: `app/Models/Activity.php` `scopeAuthorized` → admins get all, others `whereRaw('1 = 0')`
- Test: `tests/Feature/ActivityAccessTest.php`

**Interfaces:** Produces `TestCase::adminToken()` (from Task 1) reused; `TestCase::apiToken()` users get `member` role.

- [ ] **Step 1: Failing tests:** `test_admin_can_list_activities` (200); `test_member_with_activity_permission_is_forbidden` (give member `viewAny-activities` → GET `/api/v1/activities` 403, GET `/api/v1/activities/{id}` 403); `test_publisher_is_forbidden` (403).
- [ ] **Step 2: Run** → FAIL on the permission test.
- [ ] **Step 3: Implement** the policy/scope change.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: restrict the activity log to admins`.

### Task 3: Search and filters

**Files:**
- Modify: `app/Models/Activity.php` (`scopeSearch`, `scopeFilter`)
- Modify: `app/Http/Requests/Activity/ListActivityRequest.php` (rules for new filters)
- Modify: `app/Http/Controllers/API/V1/Security/ActivityController.php` (`index` reads camelCase keys, maps `orderBy` via `getOrderByColumns()`, eager-loads `causer`, `subject`)
- Test: `tests/Feature/ActivitySearchTest.php`

**Interfaces:**
- Consumes: Task 1 activities.
- Produces: `GET /api/v1/activities?term&causerId&event&logName&subjectType&dateFrom(Y-m-d)&dateTo(Y-m-d)&page&pageSize&orderBy&orderDirection`.

- [ ] **Step 1: Failing tests** (admin token):
  - `test_search_matches_causer_name`: activity caused by user `first_name=Mariana` → `term=marian` returns it, `term=zzz` returns none.
  - `test_search_matches_changed_values`: update member birthdate to `1932-04-02` → `term=1932-04` finds the `updated` row.
  - `test_search_respects_filters`: two matching rows, different `event` → `term=x&event=login` returns 1.
  - `test_date_range_filter`: rows on 2026-11-01 and 2026-11-10 → `dateFrom=2026-11-05` returns only the later; `dateTo=2026-11-05` the earlier (inclusive of whole day).
  - `test_page_size_is_honoured`: 30 rows, `pageSize=5` → `meta.per_page == 5`, 5 items.
  - `test_literal_wildcards_in_term`: `term=%` and `term=_` return only rows actually containing those chars, no 500.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `scopeSearch`: escape `\ % _`, wrap in `$builder->where(fn ($q) => …)` with `orWhere` on `description`, `event`, `log_name`, `subject_type`, `properties` (LIKE on the JSON text), and `orWhereHasMorph('causer', [User::class], fn ($u) => $u->where first_name/last_name/email LIKE)` plus `CONCAT`-free full-name match via `first_name || ' ' || last_name` — use `DB::raw` per driver or match each part separately. `scopeFilter`: `causerId` → `causer_type=User, causer_id`; `subjectType` short name → FQCN map `['family-member'=>FamilyMember::class,'user'=>User::class,'role'=>Role::class, …]`; dates → `whereDate`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: search activities by person, values and date`.

### Task 4: Resource shape and filter options

**Files:**
- Modify: `app/Http/Resources/Activity/ActivityResource.php`
- Modify: `routes/api.php` (add `Route::get('/filters', 'filters')` **before** `/{activity}`)
- Modify: `ActivityController` (`filters(ListActivityRequest $request): JsonResponse`)
- Test: `tests/Feature/ActivityResourceTest.php`

**Interfaces:**
- Produces JSON item: `{id, logName, event, description, causer: {id, firstName, lastName, email} | null, subjectType: string|null (kebab short name), subjectId: int|null, subjectLabel: string, changes: [{field: string, old: mixed, new: mixed}], properties: object, createdAt}`.
- Produces `GET /api/v1/activities/filters` → `{data: {events: string[], logNames: string[], subjectTypes: string[], causers: [{id, name, email}]}}`.

- [ ] **Step 1: Failing tests:** `test_changes_are_normalised` (update member name → `changes == [['field'=>'first_name','old'=>'Ion','new'=>'Ioan']]`); `test_deleted_subject_label` (force-delete member → `subjectLabel == "#{$id} (deleted)"`); `test_null_causer_renders` (activity with no causer → `causer` null, 200); `test_filters_endpoint_lists_distinct_values` (admin 200, keys present; member 403).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `changes` = union of keys of `properties.attributes` and `properties.old`, skipping keys absent from both; relationship entries flatten each list to comma-joined names. `subjectLabel`: FamilyMember/User → full name, Role → `display_name ?? name`, otherwise `"{short} #{id}"`; missing subject → `"#{id} (deleted)"`.
- [ ] **Step 4: Run** → PASS; `php artisan test` all green.
- [ ] **Step 5: Commit** `feat: expose field changes and filter options for activities`.

### Task 5: Client — model, service, highlight pipe, admin guard

**Files:**
- Modify: `client/src/app/core/models/user.model.ts` (add `roles?: { id: number; name: string; displayName: string }[]`)
- Create: `client/src/app/core/models/activity.model.ts` (+ export in `models/index.ts`)
- Modify: `client/src/app/core/services/auth.service.ts` (add `readonly isAdmin = computed(() => !!this.currentUser()?.roles?.some(r => r.name === 'admin'))`)
- Create: `client/src/app/core/services/activity.service.ts` (+ export in `services/index.ts`)
- Create: `client/src/app/core/guards/admin.guard.ts` (+ spec)
- Create: `client/src/app/shared/pipes/highlight.pipe.ts` (+ `highlight.pipe.spec.ts`)

**Interfaces:**
- Produces: `interface Activity { id; logName; event; description; causer: {id; firstName; lastName; email} | null; subjectType: string|null; subjectId: number|null; subjectLabel: string; changes: ActivityChange[]; properties: Record<string, unknown>; createdAt: string }`, `interface ActivityChange { field: string; old: unknown; new: unknown }`, `interface ActivityQuery { page?; pageSize?; orderBy?: 'createdAt'|'event'|'logName'; orderDirection?; term?; causerId?: number; event?; logName?; subjectType?; dateFrom?: string; dateTo?: string }`, `interface ActivityFilterOptions { events: string[]; logNames: string[]; subjectTypes: string[]; causers: {id: number; name: string; email: string}[] }`.
- Produces: `ActivityService.paginate(q: ActivityQuery): Observable<PaginatedResponse<Activity>>`, `ActivityService.filters(): Observable<ActivityFilterOptions>`.
- Produces: `adminGuard: CanActivateFn` (waits `authService.initialize()`, returns `true` or `UrlTree('/dashboard')`).
- Produces: `HighlightPipe` (`highlight`, standalone, pure): `transform(value: unknown, term: string | null | undefined): string` returning HTML-safe string with `<mark class="activity-hit">…</mark>`; bind via `[innerHTML]`.

- [ ] **Step 1: Failing pipe spec:** `'Ion Iordachi' | highlight:'io'` → `'<mark class="activity-hit">Io</mark>n <mark class="activity-hit">Io</mark>rdachi'`; `'<b>x</b>' | highlight:'b'` contains no raw `<b>`; term `'a.('` on `'xa.(y'` marks `a.(` only; empty term returns escaped value unchanged; `null` value → `''`.
- [ ] **Step 2: Run** `cd client && npx ng test --watch=false --include='**/highlight.pipe.spec.ts'` → FAIL.
- [ ] **Step 3: Implement** pipe, models, service (same `HttpParams` loop as `FamilyTreeService.paginate`), `isAdmin`, guard (+ spec: admin → true, member → UrlTree `/dashboard`).
- [ ] **Step 4: Run** `npx ng test --watch=false` → PASS.
- [ ] **Step 5: Commit** `feat(client): activity models, service, highlight pipe and admin guard`.

### Task 6: Client — activity report page, menu, dashboard card

**Files:**
- Create: `client/src/app/features/activity/activity-log.component.{ts,html,scss}`
- Modify: `client/src/app/app.routes.ts` (child `{ path: 'activity', canActivate: [adminGuard], loadComponent: … }`)
- Modify: `client/src/app/layout/menu/menu.component.ts` ("Administration" group with "Activity log", `pi pi-fw pi-history`, `routerLink ['/activity']`, `visible` bound to `auth.isAdmin()` — make `model` a `computed`)
- Create: `client/src/app/features/dashboard/widgets/recent-activity-widget.component.{ts,html}`
- Modify: `client/src/app/features/dashboard/dashboard.component.{ts,html}` (render widget only `@if (auth.isAdmin())`)

**Interfaces:** Consumes everything Task 5 produces.

- [ ] **Step 1: Build the page.** Signals for `term`, `filters`, `rows`, `total`, `loading`; search input debounced 300 ms; `p-select` for user/action/entity (options from `filters()`), `p-datepicker` range; lazy `p-table` (`pageSize` 25, sort on `createdAt`), columns Time (`date:'medium'`), User (name + email), Action (`p-tag`), Entity (`subjectType` + `subjectLabel`), Description — every text cell `[innerHTML]="x | highlight: term()"`. Row expansion: changes table Field / Before / After (values `| highlight`), plus non-change properties (e.g. `remember`, IP) as key/value list. Query params sync both ways via `Router`/`ActivatedRoute` (`term`, `causerId`, `event`, `subjectType`, `dateFrom`, `dateTo`, `page`). `.activity-hit` style in component scss using `::ng-deep` with the theme's highlight token (background `var(--p-yellow-200)`, dark `var(--p-yellow-500)` at 40% alpha), `border-radius: 2px`.
- [ ] **Step 2: Dashboard widget:** last 8 activities (`pageSize: 8`), each line "user · description · relative time", footer link "View full report" → `/activity`.
- [ ] **Step 3: Build** `cd client && npx ng build` → succeeds with no errors.
- [ ] **Step 4: Browser check** via preview: as admin — menu item visible, search "ion" highlights in user/description/changes, filter + search combine, expand row shows before/after, URL carries the query; as member — menu item hidden, visiting `/activity` lands on `/dashboard`, no dashboard card.
- [ ] **Step 5: Commit** `feat(client): admin activity report page and dashboard card`.
