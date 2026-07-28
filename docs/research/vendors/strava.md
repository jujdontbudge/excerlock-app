# Strava API — integration sheet

Researched 2026-07-28 against live official docs (developers.strava.com, strava.com/legal, press.strava.com). All numbers verified against the pages cited; anything unverifiable is flagged.

---

## 1. OAuth flow & scopes

**Authorization URLs**
- Web: `GET https://www.strava.com/oauth/authorize`
- Mobile (Strava-app handoff): `GET https://www.strava.com/oauth/mobile/authorize` (deep link `strava://oauth/mobile/authorize` when the Strava app is installed)

**Authorize request params**: `client_id`, `redirect_uri` (must be within the callback domain configured on the app; `localhost` and `127.0.0.1` are white-listed), `response_type=code`, `scope` (comma- or URL-safe-space-delimited, e.g. `activity:read_all,activity:write`), optional `approval_prompt` (`auto`|`force`), optional `state` (returned in redirect — use it for CSRF).

**Token exchange**: `POST https://www.strava.com/api/v3/oauth/token` with `client_id`, `client_secret`, `code`, `grant_type=authorization_code`. Response: `token_type`, `access_token`, `expires_at` (epoch), `expires_in`, `refresh_token`, `athlete`, `scope`. For ExcerLock this call lives on the backend proxy (client secret server-side); the app only handles the redirect and ships `code` + `state` to the proxy.

**Scopes ExcerLock needs**
- `activity:read` — "read the user's activity data for activities that are visible to Everyone and Followers, excluding privacy zone data".
- `activity:read_all` — same as `activity:read` **plus** activities the athlete set to "Only You" visibility (and privacy-zone data). **ExcerLock should request `activity:read_all`**: many athletes default new activities to private/Only You; with only `activity:read` those workouts would be invisible and the user's goal would falsely fail. Users can decline individual scopes on the consent screen — check the `scope` field in the token response and degrade gracefully (warn that private activities won't count).
- Not needed: `read`, `read_all`, `profile:*`, `activity:write`.

**Mobile redirect handling (Expo/RN)**: Strava's mobile flow: on iOS check whether the `strava://` scheme resolves; if the Strava app is installed, open `strava://oauth/mobile/authorize` (app-to-app auth); otherwise fall back to `SFAuthenticationSession`/`ASWebAuthenticationSession` (i.e. `expo-web-browser` `openAuthSessionAsync`) against the web `oauth/mobile/authorize` URL. `redirect_uri` must match the app's configured Authorization Callback Domain — for app-to-app returns Strava docs use an app deep link (custom scheme / universal link) registered there.

Source: https://developers.strava.com/docs/authentication/

---

## 2. Token lifetimes & refresh

- **Access token lifetime: 6 hours** ("Access tokens expire six hours after they are created"; `expires_in` = 21,600 s). Response includes both `expires_at` (epoch) and `expires_in`.
- **Refresh tokens rotate**: a refresh token is issued on every successful token-endpoint call; "expect that this value can change anytime you retrieve a new access token. Once a new refresh token code has been returned, the older code will no longer work." → the backend must persist the newest refresh token atomically after every refresh. Revoking a refresh token also revokes its access tokens.
- **Refresh endpoint**: `POST https://www.strava.com/api/v3/oauth/token` with `client_id`, `client_secret`, `grant_type=refresh_token`, `refresh_token`. Convenience behavior: if the user's current access token still has **> 1 hour** left, Strava returns the existing token instead of minting a new one (safe to refresh eagerly).
- Deauthorization: legacy `POST https://www.strava.com/oauth/deauthorize`; recommended as of June 1 2026: `POST https://www.strava.com/oauth/revoke`.

Source: https://developers.strava.com/docs/authentication/

---

## 3. Rate limits

Per the live rate-limits page (limits are **per application**, not per user):

- **Overall: 200 requests / 15 min and 2,000 requests / day.**
- **Read (non-upload) endpoints: 100 requests / 15 min and 1,000 requests / day** — this is the limit that governs ExcerLock, since all our calls are reads.
- 15-min windows reset on the natural quarter hour (:00 / :15 / :30 / :45); daily limits reset at midnight **UTC**.
- **Headers** (on every response): `X-RateLimit-Limit` and `X-RateLimit-Usage` (overall; two comma-separated values = 15-min,daily) plus `X-ReadRateLimit-Limit` and `X-ReadRateLimit-Usage` (read-specific).
- **On exceed: HTTP 429 Too Many Requests** with a JSON error body. Back off until the next quarter-hour boundary (or next UTC midnight if the daily bucket is exhausted).

Ambiguity note: the Getting Started page describes the 10-athlete tier as having "200 requests every 15 minutes, 2,000 per day," matching the overall default above; per-app limits can be raised via review (see §8). Sizing: at 1,000 reads/day, ~100 DAU polling ~5×/day each with 2 calls/poll exhausts the default read budget — webhooks (§6) + server-side caching are effectively mandatory at scale.

Sources: https://developers.strava.com/docs/rate-limits/ , https://developers.strava.com/docs/getting-started/

---

## 4. Endpoints for ExcerLock's signals

**List activities**: `GET https://www.strava.com/api/v3/athlete/activities`
- `after` — epoch seconds; returns activities that took place after this time.
- `before` — epoch seconds; activities before this time.
- `page` (default 1), `per_page` (default 30; a documented maximum is not stated on the reference page).
- "Today" query: compute the user's local midnight → epoch, call with `after=<local_midnight_epoch>` (optionally `before=now`). Then double-check each result's `start_date_local` against the device's notion of "today" — `after`/`before` filter on UTC time, so cross-check avoids edge-of-day mismatches.
- Returns an array of `SummaryActivity`.

**Activity detail**: `GET https://www.strava.com/api/v3/activities/{id}` (param `include_all_efforts` — not needed) → returns `DetailedActivity`.

**Field map (verified against the reference)**
| Signal | Field | Endpoint | Notes |
|---|---|---|---|
| Activity type | `sport_type` (e.g. `Run`, `Ride`, `Swim`, `MountainBikeRide`) | list + detail | `type` is the legacy field; prefer `sport_type` |
| Start time | `start_date` (UTC, ISO 8601), `start_date_local`, `timezone` | list + detail | dedup key |
| Duration | `moving_time` (s), `elapsed_time` (s) | list + detail | see mapping below |
| Distance | `distance` (meters, float) | list + detail | |
| Calories | `calories` (float, kcal) | **detail only** — confirmed: `calories` appears on `DetailedActivity`, not on `SummaryActivity` (which only has `kilojoules`, ride-power work) | 1 extra API call per activity |
| Steps | **not available** — no steps field anywhere in the API reference | — | steps goals cannot be powered by Strava |
| IDs for dedup | `id`, `external_id` (source file id, e.g. `garmin_ping_…`), `upload_id`, `device_name` (detail only) | | |

**ExcerLock condition → field mapping**
- **Distance goal/exchange (run/cycle/swim)**: filter `sport_type` ∈ allowed set for the condition; sum `distance` of today's non-manual activities.
- **Active-calorie goal/exchange**: sum `calories` — requires a **detail fetch per activity** (budget: n+1 reads per poll; cache fetched details server-side by activity `id`).
- **Active-minutes goal/exchange**: sum `moving_time` (recommended — excludes paused/idle time; `elapsed_time` includes stopped time and is cheatable by leaving a recording running).
- **"Finish any workout ≥ N minutes"**: any single today's activity with `moving_time >= N*60` (any `sport_type`), non-manual.
- **Cross-source dedup**: (`sport_type`, `start_date`, `elapsed_time`/`moving_time`) as fuzzy key against HealthKit/other vendors; `external_id` + `device_name` identify the originating device/file (e.g. a Garmin activity synced to both Strava and Apple Health).

Source: https://developers.strava.com/docs/reference/ (List Athlete Activities, Get Activity, SummaryActivity, DetailedActivity)

---

## 5. Manual-entry detection

Fields on `SummaryActivity`/`DetailedActivity`:
- `manual` (boolean) — true when the activity was created by hand rather than uploaded from a recording. **Primary anti-cheat filter.**
- `trainer` (boolean) — activity done on a trainer/treadmill; device-recorded trainer rides are legitimate exercise, so do **not** exclude on `trainer` alone (but note trainer rides can have distance without GPS).
- `external_id` (string) / `upload_id` (integer) — reference the uploaded source file; manual entries have no upload. (The reference documents the fields; "null for manual entries" follows from there being no upload but is not spelled out verbatim in the docs — treat as corroborating signal, not sole gate.)
- `device_name` (string, **detail endpoint only**, e.g. "Garmin Edge 1030") — presence of a real recording device is a strong positive signal.

**Recommended filter (ExcerLock)**: accept an activity iff `manual === false` **AND** (`upload_id` present OR `device_name` present). Reject `manual === true` outright. Optionally flag zero-distance-yet-distance-goal or `elapsed_time >> moving_time` outliers. Note the residual hole: a user can record a bogus "workout" with a phone in their pocket — Strava data can't detect effort, only entry method; heart-rate fields (`has_heartrate`, `average_heartrate`) exist on activities and can be used as an optional stricter tier.

Source: https://developers.strava.com/docs/reference/ (SummaryActivity / DetailedActivity models)

---

## 6. Webhooks

- **Available to all API apps; one subscription per application** (events for all of that app's authorized athletes flow through it).
- **Subscribe**: `POST https://www.strava.com/api/v3/push_subscriptions` with form fields `client_id`, `client_secret`, `callback_url` (≤ 255 chars), `verify_token` (your own random string). Also GET (view) and DELETE on the same resource.
- **Validation handshake**: on subscribe, Strava GETs your `callback_url` with `hub.mode=subscribe`, `hub.challenge=<random>`, `hub.verify_token=<yours>`. You must respond **within 2 seconds**, status 200, body `{"hub.challenge":"<echoed value>"}`. Success returns `{"id": <subscription_id>}`.
- **Event payload** (POST to your callback):

```json
{
  "aspect_type": "create",            // "create" | "update" | "delete"
  "event_time": 1516126040,
  "object_id": 1360128428,             // activity id or athlete id
  "object_type": "activity",          // "activity" | "athlete"
  "owner_id": 134815,                  // athlete id
  "subscription_id": 120475,
  "updates": {}                        // on update: e.g. {"title":"...","type":"...","private":"false"}; on deauth: {"authorized":"false"}
}
```

- **Events**: activity create / update (title, type, privacy) / delete; athlete **deauthorization** (`object_type: "athlete"`, `updates.authorized: "false"`) — use this to trigger the 30-day data-deletion obligation (§7).
- Payloads carry **no activity data** — on `create`, fetch the activity via the API (counts against read limits).
- **Ack fast**: your callback must return 200 within 2 seconds; process asynchronously. Strava retries failed deliveries up to 3 total attempts.
- **Latency**: docs describe events being pushed as changes occur and note activity attributes update asynchronously (one save can fire multiple events). No numeric latency SLA is published; treat as near-real-time but not guaranteed, and keep poll-on-open as fallback.
- Scope-aware delivery: "Only You" activity events require `activity:read_all` — another reason to request that scope.

Source: https://developers.strava.com/docs/webhooks/

---

## 7. ToS & branding restrictions

The Nov 11 2024 API Agreement update introduced three changes (per Strava's press release: affecting "less than .1% of applications"): (1) third-party apps may only display a user's Strava data **to that user**; (2) explicit prohibition on using Strava data for **AI model training**; (3) protections against **replicating Strava's look/feel**. The current governing docs are the API Agreement + API Policy, both effective **June 1, 2026**.

Key clauses (verbatim where quoted):
- **Display**: "Strava Data provided by a specific Strava user may be displayed or disclosed in your Developer Application only to that user." (API Policy §2.3) — Fine for ExcerLock: we only show the authenticating user their own activity. **Red flag**: any social/leaderboard/partner-visibility feature must never surface Strava-derived data to anyone else.
- **Retention**: "You may not retain Strava Data in your cache for longer than seven (7) days." (API Policy §6.2) — **Biggest constraint for ExcerLock**: the backend may cache raw activity data max 7 days. Evaluating "today's" goals is fine; long-term history/streak screens must not be built on stored Strava activity data. (Storing your own derived, non-Strava facts — e.g. "goal met on date X" — is the usual pattern, but the policy doesn't explicitly bless derivatives; keep stored derivatives minimal and non-reconstructive.)
- **Deletion**: on user deletion request, revocation of authorization, or account deletion, data must be permanently deleted "within thirty (30) days" (API Policy §7.4) — wire this to the deauth webhook.
- **AI/ML**: no use of Strava API materials/data "in connection with the development, training, evaluation, or operation of any AI Application," including training, fine-tuning, embedding generation, RAG (API Policy §5.3). — Do not feed Strava data into any LLM feature (summaries, coaching chat) in ExcerLock.
- **No competing/imitating**: no use "in any manner that is competitive to Strava," no imitating Strava's look/imagery/brand (API Policy §5.2). ExcerLock (screen-time lock) does not compete.
- **Is gating screen time on Strava data OK?** Not explicitly addressed anywhere in the Agreement/Policy. It fits the blessed pattern ("tools that help users understand their data" / user-benefiting apps, per the press release), displays data only to the user, and isn't in any prohibited-use list — reasonable to proceed, but it is an unusual "consequential" use of the data; flag for a quick check with Strava during app review (§8).
- **Branding** (Brand Guidelines): use the official **"Connect with Strava"** button (48px @1x) linking to the OAuth authorize URL; display **"Powered by Strava"** or "Compatible with Strava" logo (orange/white/black, unmodified, separate from your branding, never in your app icon); link displayed activities back with **"View on Strava"** (bold/underline/Strava orange #FC5200); **no "Strava" in the app name**. The API Policy §4.4 additionally requires passing through **Garmin attribution** when displaying Garmin-sourced data per Garmin's brand guidelines.

Sources: https://press.strava.com/articles/updates-to-stravas-api-agreement , https://www.strava.com/legal/api , https://www.strava.com/legal/api_policy , https://developers.strava.com/guidelines/

---

## 8. Production approval

1. Create the app at `strava.com/settings/api` (Strava account needed; the Getting Started page states **"A Strava subscription is required"** to create an API app — i.e. a paid Strava account).
2. New apps start in **"single-player mode"**: only the developer's own account can authenticate.
3. Self-serve upgrade to a tier with **athlete capacity of 10** and rate limits of 200 req/15 min, 2,000/day — enough for internal/TestFlight testing.
4. Beyond 10 athletes: **submit the app for review** via Strava's designated form. Review gates both athlete capacity and rate-limit increases. Requirements center on API Agreement/Policy + Brand Guidelines compliance (this is where §7 branding must already be in place).
5. **Timeline: not published** in official docs — could not verify; plan for the review as a launch-blocking dependency and apply early.

Friction assessment: **medium-high** — hard 10-athlete wall before review, paid Strava subscription required to even register, and post-Nov-2024 compliance scrutiny (display/retention/AI).

Source: https://developers.strava.com/docs/getting-started/

---

## 9. Key facts table

| Fact | Value |
|---|---|
| Auth type | OAuth2 auth-code, server-side exchange; rotating refresh tokens |
| Access token TTL | 6 hours (`expires_in` 21,600 s); refresh token rotates on each refresh |
| Rate limit | App-wide: 200/15 min + 2,000/day overall; **reads: 100/15 min + 1,000/day**; 429 on exceed |
| Webhooks | Yes — 1 subscription/app; create/update/delete + deauth; near-real-time (no SLA); payload has IDs only |
| Manual-entry flag | Yes — `manual` boolean (+ `trainer`, `upload_id`/`external_id`, `device_name`) |
| Calories | Detail endpoint only (`GET /activities/{id}` → `calories`); list has only `kilojoules` |
| Steps | Not available |
| Data retention | Cache ≤ 7 days; delete within 30 days of deauth/deletion request |
| Approval friction | Medium-high (10-athlete cap until review; paid Strava subscription to register; no published review SLA) |
