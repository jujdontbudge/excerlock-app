# Whoop API — integration sheet

> **Historical (P2-T12 cutover, 2026-09-07).** Vendor integrations are out of the product (decision D6 in
> `plans/rebuild/00-decisions.md`); the server's vendor routes and tables were removed in P2-T02. This file is
> kept as a record of the research only. Do not act on it.

Researched 2026-07-28 against live official docs (developer.whoop.com). API version: **v2** (v1 is no longer supported; v2 migration completed in 2025 — all new integrations must use v2 paths and UUID identifiers).

---

## 1. OAuth flow & scopes

Standard OAuth 2.0 authorization-code flow.

- **Authorization URL:** `https://api.prod.whoop.com/oauth/oauth2/auth`
- **Token endpoint:** `https://api.prod.whoop.com/oauth/oauth2/token`
- **Client ID / secret:** issued in the WHOOP Developer Dashboard when you create an app. Secret must stay server-side — fits ExcerLock's token-exchange proxy model.
- **Redirect URIs:** must be pre-registered in the dashboard. Both `https://…` and custom-scheme (`whoop://example/redirect`-style) redirects are accepted, so a mobile app can use either an app scheme or (better for ExcerLock) the backend proxy's HTTPS callback which then deep-links back into the app.
- **`state` param:** required practice, minimum 8 characters (CSRF protection).

**Exact scope strings** (all six member-data scopes + offline):

| Scope | Grants |
|---|---|
| `read:workout` | Workout collection/detail |
| `read:cycles` | Physiological cycles (day strain) |
| `read:recovery` | Recovery scores |
| `read:sleep` | Sleep (not needed for ExcerLock v1) |
| `read:profile` | Basic profile (name, user id) |
| `read:body_measurement` | Height/weight/max HR |
| `offline` | Issues a refresh token |

ExcerLock minimum set: `read:workout read:cycles read:recovery offline` (add `read:profile` if you want a display name).

Token revocation: `revokeUserOAuthAccess` endpoint (call when a user disconnects Whoop in ExcerLock).

Sources: https://developer.whoop.com/docs/developing/oauth/ , https://developer.whoop.com/api/

## 2. Token lifetimes & refresh

- **Access token lifetime:** returned in `expires_in`; observed/documented value **3600 s (1 hour)**. Expired token → `401 Unauthorized`.
- **Refresh token:** only issued if the **`offline` scope** was in the authorization request.
- **Refresh endpoint:** same token endpoint, `POST https://api.prod.whoop.com/oauth/oauth2/token` with `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret`, `scope=offline`.
- **Rotation:** refresh returns a *new* refresh token, and **existing access tokens are invalidated when the refresh token is used** — store the newest pair atomically server-side; do not refresh concurrently from multiple workers.
- Refresh-token absolute lifetime is **not stated in the docs** (no documented expiry; treat as long-lived until revoked, but handle refresh failure by prompting re-auth).

Sources: https://developer.whoop.com/docs/developing/oauth/ , https://developer.whoop.com/docs/tutorials/refresh-token-postman/

## 3. Rate limits

- **Default: 100 requests/minute and 10,000 requests/day** per API client (app-wide, not per user — plan polling accordingly).
- Headers on every response:
  - `X-RateLimit-Limit` — current limit values/windows
  - `X-RateLimit-Remaining` — requests left before rejection
  - `X-RateLimit-Reset` — seconds until the counter resets
- On exceed: **`429 Too Many Requests`**. No documented `Retry-After`/backoff guidance — back off using `X-RateLimit-Reset`.
- Increases available on request via a WHOOP form (justify use case).

Note for ExcerLock: 10k/day app-wide means ~3 polls/day/user caps out around ~3,300 users on polling alone — webhooks (section 6) are the intended scale path.

Source: https://developer.whoop.com/docs/developing/rate-limiting/

## 4. Endpoints for ExcerLock's signals

Base: `https://api.prod.whoop.com/developer` (paths below as documented). All collections support `limit` (max **25**, default 10), `start` (ISO 8601, inclusive), `end` (ISO 8601, exclusive, defaults to now), `nextToken` (pagination cursor).

| Resource | Path |
|---|---|
| Workout collection | `GET /v2/activity/workout` |
| Workout by ID | `GET /v2/activity/workout/{workoutId}` |
| Cycle collection | `GET /v2/cycle` |
| Cycle by ID | `GET /v2/cycle/{cycleId}` |
| Recovery collection | `GET /v2/recovery` |
| Recovery for cycle | `GET /v2/cycle/{cycleId}/recovery` |
| Profile | `GET /v2/user/profile/basic` |
| Body measurements | `GET /v2/user/measurement/body` |

**Workout object:** `id` (UUID), `v1_id`, `user_id`, `start`, `end`, `timezone_offset`, `sport_name` (lowercase string, e.g. `"running"`), `sport_id` (int, ~100+ values, −1…272), `score_state`, `score` → `{ strain, average_heart_rate, max_heart_rate, kilojoule, percent_recorded, distance_meter, altitude_gain_meter, altitude_change_meter, zone_durations { zone_zero_milli … zone_five_milli } }`. `distance_meter`/altitude fields are optional (GPS-based sports only).

**Cycle object (day strain):** `id`, `start`, `end`, `timezone_offset`, `score_state`, `score` → `{ strain, kilojoule, average_heart_rate, max_heart_rate }`. A cycle is a *physiological day* (wake-to-wake, not midnight-to-midnight); the **current cycle has no `end`** — for "today's strain," fetch the latest cycle and treat its `score.strain` as live/running.

**Recovery object:** keyed to a cycle; `score_state`, `score` → `{ recovery_score (0–100), resting_heart_rate, hrv_rmssd_milli, spo2_percentage, skin_temp_celsius }`.

**`score_state` semantics (critical for polling):** `SCORED` | `PENDING_SCORE` | `UNSCORABLE`. A workout that just ended may be `PENDING_SCORE` (score object absent) — ExcerLock's evaluator must re-poll or wait for a `workout.updated` webhook rather than failing the goal. `UNSCORABLE` = insufficient sensor data; score never arrives (treat as failed evidence for strain/calorie goals; start/end/duration are still usable for minutes goals — decide policy).

**Units:** energy is **kilojoules**. kcal = kJ / 4.184 (e.g. 1,000 kJ ≈ 239 kcal). Distance is meters. Zone durations are milliseconds.

**Condition mapping:**

| ExcerLock condition | Whoop field(s) |
|---|---|
| Hit a strain target (Whoop-unique) | Workout `score.strain` (per-workout) or cycle `score.strain` (day strain) |
| Active-minutes goal | Sum of workout `end − start` (optionally weight by `zone_durations` ≥ zone 1 for "quality" minutes) |
| Workout count / "any workout ≥ N min" | Count of workouts with `end − start ≥ N` in window |
| Calorie goal | Workout `score.kilojoule` summed, or cycle `score.kilojoule` for whole-day burn; convert /4.184 |
| Distance goal | Workout `score.distance_meter` (only present for distance sports) |
| Recovery gate ("only lock if recovery < X") | Recovery `score.recovery_score` |

**What Whoop CANNOT provide:** **no steps** anywhere in the v2 API (verified against the workout/cycle models — no step-count field). No floors, no stand hours, no per-second HR stream, no GPS route/track. Recovery/day-strain exist nowhere else — this is Whoop's unique value.

**Dedup fields for cross-source matching:** `start`, `end`, `sport_name`/`sport_id`, duration, `id` (UUID, stable), `v1_id`. Note Whoop auto-detects activities, so a Strava-recorded run will usually also appear as a Whoop workout with near-identical start/end — dedup on overlapping time window + sport class.

Sources: https://developer.whoop.com/api/ , https://developer.whoop.com/docs/developing/user-data/workout/ , https://developer.whoop.com/docs/tutorials/get-current-recovery-score/ , https://developer.whoop.com/docs/developing/v1-v2-migration/

## 5. Manual-entry detection

- **Yes, users can manually log activities** in the WHOOP app ("Add Activity"), either in real time or retroactively for a past window (WHOOP Support: "Logging Activities & Sleep", "Automatic and Manual Activity Detection").
- **The v2 API exposes NO field distinguishing manual vs auto-detected vs sensor-recorded** — no `source`, no `is_manual` flag. Docs are silent; be honest that you cannot flag manual entries directly.
- **Mitigating factor (important for anti-cheat):** Whoop scores every workout from the **24/7 heart-rate stream actually recorded by the strap** during that time window — a manually logged window is not user-supplied data, it's re-scored from real sensor HR. A user "manually adding" a fake workout while sitting on the couch gets near-zero strain/kilojoules, or `UNSCORABLE` if the strap wasn't worn. Additionally, `score.percent_recorded` reports how much of the window had sensor data — **treat low `percent_recorded` (e.g. < 80%) as untrusted** for goal credit. This makes Whoop one of the *harder* vendors to cheat: users can fabricate that a workout happened, but not its strain/calories.
- Residual cheat vector: strapping the device to someone/something else — not detectable via API.

Sources: https://developer.whoop.com/docs/developing/user-data/workout/ , https://support.whoop.com/hc/en-us/articles/360023249473-Logging-Activities-Sleep , https://support.whoop.com/hc/en-us/articles/360046006594-Automatic-and-Manual-Activity-Detection

## 6. Webhooks

- **Available, first-class.** Configure per-app in the Developer Dashboard: add HTTPS POST endpoint URL(s); multiple URLs per app; **choose webhook model version (v1 or v2) per endpoint — use v2** (UUIDs).
- **Event types (6):** `workout.updated`, `workout.deleted`, `sleep.updated`, `sleep.deleted`, `recovery.updated`, `recovery.deleted`. **Creations fire as `.updated`** — there is no separate `.created` event. No cycle event type; day-strain changes must still be polled (or inferred from recovery/workout events).
- **Payload:** thin notification — `{ user_id (int64), id (UUID string in v2), type, trace_id }`. No data in the payload; fetch the resource by `id` afterward. v2 recovery events carry the associated **sleep UUID** (not cycle id).
- **Signature validation:** headers `X-WHOOP-Signature` + `X-WHOOP-Signature-Timestamp` (ms epoch). Verify: HMAC-SHA256 over `timestamp + rawBody` using the app's client secret, base64-encode, compare to signature header.
- **Delivery/retries:** requires a `2XX` response; retries failed deliveries **5 times over ~1 hour**. Respond within ~1 s and process async. Docs do not publish a delivery-latency SLA; in practice events fire when Whoop scores/rescores an activity (a `workout.updated` will also fire when a `PENDING_SCORE` workout becomes `SCORED` — this pairs perfectly with ExcerLock's evaluate-on-open model).

Source: https://developer.whoop.com/docs/developing/webhooks/

## 7. ToS & branding restrictions

WHOOP API Terms of Use (https://developer.whoop.com/api-terms-of-use/) — key points for ExcerLock:

- **No permanent copies:** may not "scrape, build databases, or otherwise create permanent copies of WHOOP Data"; retention limited to cache headers. ExcerLock should store only derived goal outcomes ("strain target met at 14:32") plus minimal dedup metadata, not mirrored raw Whoop history.
- **No selling/licensing** Whoop data to third parties, *even with user consent*. No paid redistribution of Whoop services.
- **No exposure to other users/third parties without explicit opt-in** (matters if ExcerLock ever adds social/accountability-partner features showing Whoop stats).
- **No HIPAA assurances**; written consent needed before transmitting PHI.
- **No reverse engineering / algorithm extraction / competing products**; no imposing conflicting end-user terms; user must be able to access their collected data on request.
- **Branding:** nontransferable, nonexclusive license to show WHOOP marks *solely* to indicate the integration; must follow the Design & Brand Guidelines (https://developer.whoop.com/docs/developing/design-guidelines/ — logo, typefaces, colors); public statements/press releases about WHOOP need pre-approval.
- **Termination:** WHOOP may terminate "for any reason and at any time without liability"; on termination you must delete cached content immediately. API currently free; charges possible with advance notice.
- Docs contain **no explicit clause** on combining Whoop data with other sources (ExcerLock's multi-vendor dedup) or ML training — combining for the user's own goal evaluation appears fine, but is not expressly addressed.

## 8. Production approval

- **Signup:** self-serve at the Developer Dashboard with a WHOOP account; up to 5 apps per developer (more on request). App creation requires ≥1 scope and ≥1 registered redirect URL; teams supported.
- **Unapproved-app cap: 10 WHOOP members** max may be enrolled. Approval unlocks >10 members. (Verified: https://developer.whoop.com/docs/developing/app-approval)
- **Review process:** (1) comply with API Terms of Use; (2) test with ≥1 member; (3) verify App Name, contact email(s), Privacy Policy URL in dashboard; (4) comply with Design & Brand Guidelines; (5) submit an App Submission request (Typeform) with designs + context.
- **Timeline: not published.** Plan for it before launch; the 10-member cap is fine for all of development/TestFlight-internal but blocks any real beta.
- Approval friction: **medium** — a real review with design screenshots, but self-serve signup, free, and clear checklist.

Sources: https://developer.whoop.com/docs/developing/getting-started/ , https://developer.whoop.com/docs/developing/app-approval

## 9. Key facts table

| Fact | Value |
|---|---|
| Auth type | OAuth 2.0 auth-code, server-side secret (proxy-friendly) |
| Access token TTL | 3600 s (1 h); refresh via `offline` scope; refresh rotates tokens |
| Rate limit | 100/min, 10,000/day per client; `429` + `X-RateLimit-*` headers |
| Webhooks | Yes — `workout/sleep/recovery` `.updated`/`.deleted`, HMAC-SHA256 signed, 5 retries/~1 h |
| Manual-entry flag | No flag — but scores derive from real strap HR; use `percent_recorded` + `UNSCORABLE` as anti-cheat proxy |
| API version | v2 only (v1 unsupported; UUIDs; `/v1/activity-mapping/{v1Id}` for legacy id lookup) |
| Steps | Not available |
| Approval friction | Medium — 10-member cap until reviewed; Typeform submission; timeline unpublished |
