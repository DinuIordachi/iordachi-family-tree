# Admin activity report — design

Date: 2026-11-17 · Status: awaiting approval

## Intent

Admins need a full, detailed, searchable audit report of what happens in the app:
who logged in / out, who created, modified or deleted which entity, and what exactly
changed. Search matches are highlighted in the results so the admin can see at a
glance why a row matched. Only the **admin** role may see it.

## Goals

- One admin-only page listing every activity, newest first, paged server-side.
- Every create / update / delete of `FamilyMember`, `User`, `Role` records the
  **old and new value of each changed field**.
- Relationship changes (parents, spouses, children) are recorded too.
- Free-text search across: description, event, entity type, causer name/email,
  and the before/after values.
- Filters: user (causer), action (event), entity type, date range.
- Matching substrings highlighted (case-insensitive) in every visible column and
  in the expanded change details.
- Dashboard gets a small "Recent activity" card (last ~8 entries) for admins,
  linking to the full report.

## Non-goals

- Exporting (CSV/PDF), real-time push of new entries, undo/restore from the log.
- Changing what non-admins can see anywhere else.

## Anti-goals

- Secrets in the log: `password`, `remember_token`, `email_code` must never be
  stored in before/after values.
- Double entries for the same action (automatic + hand-written).
- Any non-admin able to read activities via UI **or** API.

## Approaches considered

- **A — automatic model change tracking (chosen).** spatie/laravel-activitylog's
  `LogsActivity` trait on the models records old/new attributes for every
  create/update/delete, wherever it originates. Complete and consistent; requires
  removing the now-duplicate hand-written lines for those models and one extra
  log line for relationship syncs.
- **B — enrich the existing hand-written log calls.** Each controller computes its
  own diff. Smaller change, but ~15 call sites, easy to miss one now or later.

Picked: **A**, by the user.

## Design

### Backend (Laravel 12, spatie/laravel-activitylog 4)

1. **Change capture.** Add `LogsActivity` to `FamilyMember`, `User`, `Role` with
   `logFillable()->logOnlyDirty()->dontSubmitEmptyLogs()`, a readable
   description (e.g. "Family member Ion Iordachi was updated"), and `log_name`
   = entity (`family-member`, `user`, `role`). `User` excludes `password`,
   `email_code`, `email_code_expires_at`, `remember_token`.
   Events are `created` / `updated` / `deleted` / `restored`.
2. **Remove duplicates.** Delete the hand-written `activity()` calls in
   `FamilyTreeController`, `UserController`, `RoleController` (and `MeController`
   profile update) whose action is now captured automatically. Keep hand-written
   entries for login, logout, password reset/forgot, email verify, photos/media,
   tokens, permissions, activity deletion, force-deletes.
3. **Relationships.** After `syncRelationships(...)` in store/update, log one
   `relationships-updated` entry on the member with before/after ID+name lists
   for parents/spouses/children — only when something changed.
4. **Model config.** Point `config/activitylog.php` `activity_model` at
   `App\Models\Activity` so the app's scopes/route binding and the package agree.
5. **Search.** `Activity::scopeSearch` matches (LIKE, case-insensitive) on
   `description`, `event`, `log_name`, `subject_type`, `properties` (JSON text,
   covers before/after values), and causer `first_name`/`last_name`/email via
   `whereHasMorph`. Wrap the OR-group in a nested `where` (today's orWhere chain
   leaks past other filters).
6. **Filters.** `causerId`, `event`, `logName`, `subjectType`, `dateFrom`,
   `dateTo`. Fix the camelCase/snake_case mismatch in `ActivityController@index`
   (request validates `pageSize`/`orderBy`, controller reads `page_size`/`order_by`).
7. **Access — admin only.** `ActivityPolicy::viewAny/view/delete` return
   `$user->isAdmin()`, ignoring the activity permissions. List eager-loads
   `causer` and `subject` (no N+1).
8. **Resource.** `ActivityResource` adds `subjectType` (short label),
   `subjectId`, `subjectLabel` (e.g. member full name, or "#12 (deleted)"),
   and a normalized `changes: [{field, old, new}]` built from
   `properties.attributes`/`properties.old`.
9. **Filter options endpoint.** `GET /activities/filters` returns the distinct
   events, log names and causers for the dropdowns.
10. **`/me` exposes `isAdmin`** (or `roles`) so the client can gate UI.

### Frontend (Angular 21 + PrimeNG)

- New lazy route `/activity` under the layout, with an `adminGuard`.
- Menu item "Activity log" under a new "Administration" group, `visible` only
  for admins.
- Page: search box (debounced ~300 ms), filter row (user, action, entity,
  date range), lazy `p-table` (time, user, action tag, entity, description),
  row expansion showing the field-by-field change table (old → new) and raw
  extra properties (IP, remember flag, etc.).
- A `highlight` pipe: escapes HTML, wraps case-insensitive matches of the
  current term in `<mark>`; used on every text cell and in change values.
- Dashboard: admin-only "Recent activity" card (last 8 entries, same
  highlighting-free rendering) with "View full report" link.
- Search term + filters kept in the URL query so a report view can be shared/bookmarked.

### Testing

- Feature tests: admin can list/filter/search; publisher and member get 403
  even with `viewAny-activities`; updating a family member stores old/new for
  the changed field only; user password change never appears in properties;
  relationship change logged once; no duplicate entry per action.
- Pipe unit test for highlighting (case-insensitivity, HTML escaping, regex chars in term).
- Manual check of the page in the browser preview.

## Left to the builder

Exact wording of descriptions, column widths/styling (follow existing admin
tokens), and which existing permissions seeders need no change.
