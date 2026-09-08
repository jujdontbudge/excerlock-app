# Oura API — integration sheet

> **Historical (P2-T12 cutover, 2026-09-07).** Vendor integrations are out of the product (decision D6 in
> `plans/rebuild/00-decisions.md`); the server's vendor routes and tables were removed in P2-T02. This file is
> kept as a record of the research only. Do not act on it.

Researched 2026-07-28 against live official sources: `https://cloud.ouraring.com/docs/authentication`, `https://cloud.ouraring.com/docs/`, `https://cloud.ouraring.com/docs/error-handling`, the v2 API reference at `https://api.ouraring.com/v2/docs` (backed by OpenAPI spec `https://api.ouraring.com/v2/static/json/openapi-1.37.json`, "Oura API Documentation 2.0"), the Oura API and MCP Agreement at `https://cloud.ouraring.com/legal/api-agreement`, and the Oura Member Care article `https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API`.

Status note: V1 API was removed January 22, 2024; V2 is "the only available integration point." **Personal access tokens were deprecated in December 2025 and are "no longer available for use"** (stated in the v2 docs overview) — OAuth2 apps are mandatory. A newer portal exists at `developer.ouraring.com` (referenced by Oura Member Care as the "newest portal"; legacy `cloud.ouraring.com` still works for existing applications), but all documented registration flows still point at `cloud.ouraring.com/oauth/applications`. No API renaming beyond the portal addition was found.

---

## 1. OAuth flow & scopes

Source: https://cloud.ouraring.com/docs/authentication

- **Authorization URL:** `https://cloud.ouraring.com/oauth/authorize`
- **Token URL:** `https://api.ouraring.com/oauth/token`
- Standard authorization-code (server-side) flow: `response_type=code`, params `client_id`, `redirect_uri` (optional if exactly one is configured — but always include it), `state` (recommended, CSRF), `scope` (space-separated; **if left blank the app requests ALL available scopes**).
- A client-side (implicit) flow also exists but has **no refresh tokens** — not appropriate for ExcerLock; use the server-side flow through the backend token-exchange proxy (client secret stays server-side; token exchange is `POST /oauth/token` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret` — or HTTP Basic auth with client credentials).

**Exact scope strings (8 total, verbatim from docs):**

| Scope | Covers |
|---|---|
| `email` | Email address of the user |
| `personal` | Personal information (gender, age, height, weight) |
| `daily` | Daily summaries of sleep, activity and readiness |
| `heartrate` | Time series heart rate for Gen 3 users |
| `workout` | Summaries for auto-detected and user entered workouts |
| `tag` | User entered tags |
| `session` | Guided and unguided sessions in the Oura app |
| `spo2` | Daily SpO2 average recorded during sleep |

**ExcerLock should request: `daily workout`** (daily_activity + daily_readiness + workouts). Add `session` only if Oura-app "Moments" sessions become a condition source (see §4 — probably not needed). `personal` is NOT needed for any ExcerLock condition. Users can toggle individual scopes at consent time, and the redirect returns the actually-granted `scope` list — **it may differ from what was requested**; parse and store it.

**Redirect handling:** redirect URIs are an exact-match whitelist configured on the app. Docs do not explicitly discuss custom mobile schemes; since ExcerLock uses a backend token-exchange proxy anyway, use an HTTPS redirect URI on the proxy and deep-link/App-Link back into the Expo app. Denial arrives as `?error=access_denied&state=...`.

## 2. Token lifetimes & refresh

Source: https://cloud.ouraring.com/docs/authentication

- **Server-side flow access token lifetime: not published as a fixed number.** The docs only say the token response's `expires_in` is the "Number of seconds that the access token is valid for." Do not hardcode — honor `expires_in` per response. (Community clients commonly observe ~24 h, but this is not verifiable from official docs; treat as unverified.)
- **Client-side (implicit) flow tokens: "currently set to 30 days"**, no refresh token — irrelevant if using server-side flow.
- **Refresh:** `POST https://api.ouraring.com/oauth/token` with `grant_type=refresh_token`, `refresh_token`, `client_id` + `client_secret` (or Basic auth). Response returns a new `access_token`, `expires_in`, and a new `refresh_token`.
- **Refresh tokens are single-use — invalidated after being used.** Always persist the new refresh token atomically; a lost rotation strands the user into re-auth. No refresh-token absolute expiry is documented.
- API calls: `Authorization: Bearer <token>` header.

## 3. Rate limits

Sources: https://cloud.ouraring.com/docs/error-handling and the v2 docs overview (https://api.ouraring.com/v2/docs)

- Legacy error-handling page (still live): **"rate limited to 5000 requests in a 5 minute period"**; exceeding returns **429**.
- The v2 reference describes a newer **two-layer** scheme: a **per-access-token** limit and a **per-application** aggregate limit across all end-user tokens. Either layer tripping returns 429. **Exact per-layer numbers are not published** — the only concrete figure anywhere in official docs is the 5000/5-min from the error-handling page; treat per-layer ceilings as unverified and read them from headers.
- **Headers on 429** (per v2 docs): `Retry-After` (seconds, RFC 7231), `X-RateLimit-Limit` (ceiling for current window), `X-RateLimit-Window` (rolling window length in seconds), `X-RateLimit-Reset` (Unix epoch seconds), `X-RateLimit-Tier` (which layer fired).
- Oura strongly pushes webhooks over polling ("we have not had customers hit rate limits with webhooks properly implemented"). Higher limits: email `api-support@ouraring.com`.
- Note: **403 Forbidden** can mean the user's Oura subscription expired — Gen3+ users **without an active Oura Membership have no API data access** (support.ouraring.com article). Handle as a distinct "reconnect/ineligible" state, not a bug.
- Sandbox endpoints share your normal rate limit.

## 4. Endpoints for ExcerLock's signals

Source: OpenAPI spec 1.37 behind https://api.ouraring.com/v2/docs. Base URL `https://api.ouraring.com`. All list endpoints take optional `start_date`, `end_date` (date or datetime strings), `next_token` (pagination), and `fields` (comma-separated projection). Responses are `{ "data": [...], "next_token": ... }`. Single-document variants: append `/{document_id}`.

### `GET /v2/usercollection/daily_activity` (scope `daily`)
One document per Oura day. Fields (all required in schema unless noted):
`id`, `day` (ISO date), `timestamp` (localized datetime with offset), **`steps`** (total steps), **`active_calories`** (kcal), **`total_calories`** (kcal), **`high_activity_time` / `medium_activity_time` / `low_activity_time`** (each in **seconds**), `sedentary_time`, `resting_time`, `non_wear_time` (seconds), `equivalent_walking_distance` (meters, an energy-expenditure equivalent — NOT measured distance), `high/medium/low_activity_met_minutes`, `average_met_minutes`, `met` (5-min MET samples), `score` (nullable 1–100), `inactivity_alerts`, `target_calories`, `target_meters`, `meters_to_target`, `class_5_min` (per-5-min activity-class string), `contributors`.

### `GET /v2/usercollection/workout` (scope `workout`)
Fields: `id`, **`activity`** (string — free-form workout type, not an enum in the spec), **`calories`** (kcal, nullable), `day` (ISO date), **`start_datetime` / `end_datetime`** (localized datetimes with UTC offset), **`distance`** (meters, **nullable**), **`intensity`** (enum: `easy` | `moderate` | `hard`), `label` (user-defined, nullable), **`source`** (enum — see §5).
Required: `id, activity, day, end_datetime, intensity, source, start_datetime` (so `calories` and `distance` can be absent/null).

### `GET /v2/usercollection/daily_readiness` (scope `daily`)
Fields: `id`, `day`, `timestamp`, **`score`** (nullable int, readiness 1–100), `temperature_deviation`, `temperature_trend_deviation`, `contributors` (activity_balance, body_temperature, hrv_balance, previous_day_activity, previous_night, recovery_index, resting_heart_rate, sleep_balance, sleep_regularity). Readiness is computed only after sleep data syncs (user must open the Oura app).

### `GET /v2/usercollection/session` (scope `session`) — probably NOT needed
These are Oura-app "Moments," not workouts: `type` enum is `breathing | meditation | nap | relaxation | rest | body_status`, plus `start_datetime`, `end_datetime`, `heart_rate`/`hrv`/`motion_count` samples, `mood`. No calories/steps. Skip unless ExcerLock ever rewards meditation.

### Day-boundary / timezone semantics
- A daily activity document is "a 24-hour period **starting at 4 a.m.**" (schema description) — Oura's day runs 04:00→04:00, keyed by `day` (an ISO date). Sleep and activity accrue to the day per this rule, in the user's local time.
- All `timestamp`/`start_datetime`/`end_datetime` values are "LocalizedDateTime" — ISO 8601 with the user's UTC offset embedded. Use these for cross-source dedup rather than assuming the phone's timezone.
- **Data freshness:** daily_activity/stress/heart-rate sync in the **background** periodically; **sleep (and therefore readiness) sync only when the user opens the Oura app**. "Today's" activity numbers are as-of last ring sync — expect staleness of minutes-to-hours; poll on app open as planned and treat webhooks as the freshness upgrade.

### Condition → field mapping

| ExcerLock condition | Oura source |
|---|---|
| Step goal / exchange | `daily_activity.steps` |
| Active-calorie goal / exchange | `daily_activity.active_calories` (kcal; `total_calories` for total burn) |
| Active-minutes goal / exchange | `(high_activity_time + medium_activity_time [+ low_activity_time]) / 60` — decide whether "active" includes low; Oura has no single "exercise minutes" field |
| "Finish any workout ≥ N min" | `workout`: `end_datetime − start_datetime`, filtered by `source` (§5); `activity` string for type display |
| Distance goal | `workout.distance` (meters) **when present** — nullable and often absent (see below). `daily_activity.equivalent_walking_distance` is an energy-equivalent estimate, not real distance |
| Readiness condition | `daily_readiness.score` (nullable — handle "no score yet today") |
| Cross-source dedup | `workout.id`, `activity`, `start_datetime`/`end_datetime` (offset-aware), `day`, duration derived from the pair |

### What Oura CANNOT provide
- **No GPS / measured route distance.** The ring has no GPS; `workout.distance` is nullable and only present when Oura has a value (e.g. imported or estimated); the docs don't guarantee it for any workout class. Do not build Oura-only distance conditions — mark distance "best effort" for Oura.
- **No per-workout steps**, no per-workout heart-rate summary in the workout document (HR time series is a separate `heartrate` endpoint/scope), no pace/splits/elevation.
- **No intraday step timestamps** beyond the 5-min `class_5_min`/`met` samples — step counts are daily totals.
- Readiness/sleep-gated signals are unavailable until the user opens the Oura app that morning.
- Gen3+ users without paid Oura Membership return no data (403-class behavior).

## 5. Manual-entry detection

Source: OpenAPI spec `PublicWorkoutSource` enum (v2 reference, Workout routes).

`workout.source` — exact enum values:

- `manual` — user-entered workout (anti-cheat: **exclude**)
- `autodetected` — Oura's motion-based auto-detection (unconfirmed)
- `confirmed` — auto-detected and confirmed by the user
- `workout_heart_rate` — recorded with the Oura app's live workout HR mode

**Recommended filter for "finish a workout" conditions: accept `confirmed`, `workout_heart_rate`, and `autodetected`; reject `manual`.** If you want stricter anti-cheat, accept only `confirmed` + `workout_heart_rate` (both require sensor data), since `autodetected` durations/types can be fuzzy. The `workout` scope description ("Summaries for auto-detected and user entered workouts") confirms manual entries flow through this same endpoint, so filtering on `source` is mandatory. Note `daily_activity` totals (steps/calories) come from the ring's sensors and are not user-editable, so they don't need this filter.

## 6. Webhooks

Source: "Webhook Subscription Routes" section of https://api.ouraring.com/v2/docs (endpoints confirmed in OpenAPI spec).

Available and officially the **preferred** consumption model. Notifications arrive **~30 seconds after data syncs from the mobile app**.

**Endpoints** (authenticated with `x-client-id` + `x-client-secret` headers — app-level, not user tokens):
- `POST /v2/webhook/subscription` — create; body `{callback_url, verification_token, event_type, data_type}` (all required)
- `GET /v2/webhook/subscription` — list; `GET /v2/webhook/subscription/{id}` — get
- `PUT /v2/webhook/subscription/{id}` — update; `PUT /v2/webhook/subscription/renew/{id}` — **renew expiration** (subscriptions carry an `expiration_time` — schedule renewal)
- `DELETE /v2/webhook/subscription/{id}` — delete (or reply 410 from your callback to auto-cancel)

- **event_type** enum: `create` | `update` | `delete`. **data_type** enum: `tag, enhanced_tag, workout, session, sleep, daily_sleep, daily_readiness, daily_activity, daily_spo2, sleep_time, rest_mode_period, ring_configuration, daily_stress, daily_cardiovascular_age, daily_resilience, vo2_max, meal`. One subscription per (event_type × data_type) combination — ExcerLock wants create+update for `daily_activity`, `workout`, `daily_readiness` (6 subscriptions).
- **Verification:** on create, Oura GETs `callback_url?verification_token=...&challenge=...`; you must check the token and respond `{"challenge": "<same string>"}` within the flow. Endpoint must answer in <10 s.
- **Event payload (POST to callback):** `{event_type, data_type, object_id, event_time, user_id}` with headers `x-oura-signature` (HMAC-SHA256 over `timestamp + JSON body` using your **client secret**, hex uppercase) and `x-oura-timestamp`. Payload is a pointer, not data — fetch the document by `object_id` with the user's token.
- **Retries:** 10 retries for 4xx/5xx/timeouts, spread over roughly an hour; implement reconciliation polling for gaps.

## 7. ToS & branding restrictions

Source: Oura API and MCP Agreement — https://cloud.ouraring.com/legal/api-agreement

Red flags for ExcerLock's architecture:
- **Storage/caching restriction:** "Unless and until you are authorized to do so by the Company in a separate written agreement or consent, you shall not store or cache any data accessed." ExcerLock's model (poll → evaluate today's goals) should keep Oura data ephemeral or obtain explicit user consent / written authorization; persist only derived condition outcomes where possible. Retain nothing beyond what's strictly necessary.
- **Deletion:** delete a user's data within **72 hours** of a deletion request; delete everything on termination.
- **No AI training** on user data (all-caps clause), no selling/sharing/aggregating user data to third parties, no reverse-engineering Oura's algorithms, no competing/replicating Oura products.
- **Consent:** must be clear, informed, freely given per data type; revocation must stop processing immediately; broadening use requires fresh consent. Never show a user's data to anyone else without express consent.
- **Branding:** trademark use only per Oura's Branding Guidelines; **cannot use the Oura name/logo in your app's name or branding**; no implied endorsement; no press releases mentioning Oura without written approval; must adopt updated brand assets when Oura changes them.
- Oura may audit security on 5 business days' notice and may revoke access immediately for violations; either party may terminate at any time.

## 8. Production approval

Sources: v2 docs overview (Data Access), https://cloud.ouraring.com/docs/, support.ouraring.com article.

- Register an OAuth2 application at `https://cloud.ouraring.com/oauth/applications` (a newer portal exists at `developer.ouraring.com`; docs still route registration through the cloud portal). Instant self-serve — get client ID + secret immediately.
- **User cap: 10 users per application until Oura approves the app.** "There is no limit once an application is approved." The review mechanics (form, timeline, criteria) are not documented publicly — expect to contact Oura (api-support@ouraring.com) when nearing the cap; plan this before launch.
- **Sandbox:** full parallel endpoint set at `/v2/sandbox/usercollection/*` with fake generated data, "accessible without an Oura account" (still bears BearerAuth/OAuth2 in the spec's security block — the tag text says no Oura account needed). Shares your production rate limit. Good for CI.
- Users must have an **active Oura Membership** (Gen3+) and a reasonably current app version for data to be available.

## 9. Key facts table

| Fact | Value |
|---|---|
| Auth type | OAuth2 authorization-code (server-side); PATs deprecated Dec 2025, unusable |
| Token TTL | Not published for server-side flow — honor `expires_in`; refresh token single-use rotation; (implicit flow: 30 days, no refresh) |
| Rate limit | 5000 req / 5 min (published); newer per-token + per-app two-layer limits, numbers via `X-RateLimit-*` headers on 429 |
| Webhooks | Yes — create/update/delete events per data type, ~30 s latency, HMAC-signed, subscriptions expire and need renewal |
| Manual-entry flag | Yes — `workout.source` ∈ {`manual`, `autodetected`, `confirmed`, `workout_heart_rate`}; exclude `manual` |
| Distance | Workout `distance` (m) nullable/unreliable; no GPS. Steps/calories/active-time/readiness all solid |
| Approval friction | Low to start (self-serve, 10-user cap), Medium to scale (undocumented approval to lift cap); users need paid Oura Membership |
| ToS red flags | No storing/caching Oura data without separate authorization; 72 h deletion; no Oura name in app branding; no AI training on data |
