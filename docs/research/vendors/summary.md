# Tier-1 vendor APIs — cross-vendor summary

Researched 2026-07-28 from official developer docs. Per-vendor detail sheets: [strava.md](strava.md) · [oura.md](oura.md) · [whoop.md](whoop.md) · [polar.md](polar.md). Context: PRD §3.5c (direct connections, dedup) and §3.3 (condition catalog). All four vendors ship in v1 (map decision 2026-07-28).

---

## 1. Cross-vendor comparison

| | **Strava** | **Oura** | **Whoop** | **Polar (AccessLink v3)** |
|---|---|---|---|---|
| Auth | OAuth2 code flow | OAuth2 code flow (PATs dead since Dec 2025) | OAuth2 code flow | OAuth2 code flow + mandatory `POST /v3/users` registration after token |
| Scopes needed | `activity:read_all` | `daily workout` | `read:workout read:cycles read:recovery offline` | `accesslink.read_all` (all-or-nothing) |
| Access-token TTL | 6 h | unpublished — honor `expires_in` | 1 h | effectively non-expiring |
| Refresh token | yes, **rotates** | yes, **rotates** (single-use) | yes, **rotates** (needs `offline`) | **none** — token lives until revoked |
| Rate limit (app-wide) | reads 100/15 min, 1,000/day (overall 200 / 2,000) | ~5,000/5 min published; layered per-token + per-app via 429 headers | 100/min, 10,000/day | dynamic: 500 + 20×users /15 min; 5,000 + 100×users /day |
| Webhooks | yes — activity create/update/delete + deauth; IDs-only payload | yes — create/update/delete × daily_activity/workout/readiness…; ~30 s; HMAC | yes — workout/sleep/recovery updated/deleted; HMAC; 5 retries | yes — EXERCISE + **ACTIVITY_SUMMARY** (daily activity covered); HMAC; one per client |
| Manual-entry flag | **yes**: `manual`, `trainer`, `device_name` | **yes**: `workout.source` (`manual`/`autodetected`/`confirmed`/`workout_heart_rate`) | no flag, but scores recomputed from strap HR → faked workouts score ~0 / `UNSCORABLE` | **no flag at all** — heuristics only (`heart-rate` presence, `has-route`, `device-id`) |
| Approval friction | **medium-high**: paid Strava sub to register; single-user → 10-athlete → review form to scale | low-medium: self-serve; **10-user cap** until approved (email process) | medium: **10-member cap** until Typeform review w/ design screenshots | **low**: self-service, no review |
| Biggest ToS constraint | 7-day cache limit; display to authenticating user only; strict no-AI (incl. RAG) | "shall not store or cache" raw data; 72 h deletion; no Oura logo in branding | no permanent copies; derived outcomes only | credit Polar as source; no logo without written consent |

**Token-proxy implications (§10 backend):** three of four vendors rotate refresh tokens on every use — the proxy must persist the new pair atomically before returning, or a crashed request bricks the connection. Polar is the outlier (no refresh at all; store one long-lived token). Polar's token endpoint uses HTTP Basic auth with the client secret, so the proxy is mandatory there too (as it is everywhere — no PKCE-only flow exists on any of the four).

**Data-retention pattern (all four):** every vendor's terms push the same direction — **evaluate today's goal, store the derived outcome (goal met, minutes credited), discard the raw vendor payload**. Strava caps caching at 7 days, Oura forbids storing outright, Whoop forbids permanent copies. ExcerLock's design (today-only evaluation, shared balance holds the result) is already compliant by construction; just never persist raw activity records.

**Anti-cheat ranking:** Whoop (hardware-bound scores) > Oura (explicit `source` enum, ring-recorded totals) > Strava (`manual`/`trainer` flags + upload evidence) > Polar (no flag — filter on heart-rate/route presence, and empirically test what a Flow manual entry looks like before shipping the filter; this is a §8 detail owed).

---

## 2. Recommended sync cadence

**Baseline (v1): poll on app open / refresh** — matches PRD §3.5c "claim your earned time" freshness honesty.

- **Query shape:** fetch only today — Strava `GET /athlete/activities?after=<local-midnight epoch>`; Oura `daily_activity` + `workout` for today's date (mind Oura's 04:00→04:00 local day); Whoop `/v2/activity/workout?start=<midnight ISO>`; Polar `GET /v3/exercises` (non-transactional, repeatable) + daily activity. **Avoid Polar's legacy transactional endpoints** — committing a transaction deletes the data server-side (once-only delivery); the non-transactional routes are re-readable.
- **Per-user client-side cooldown of ~5 min** between polls of the same vendor (a refresh spam guard). The binding constraint is **Strava: 100 reads/15 min for the whole app** — at ~1–2 reads per evaluation (list + detail when a calorie goal needs it), uncoordinated polling stops scaling around ~50–100 DAU. The proxy should route vendor calls so it can meter, cache within-session, and request Strava/Whoop limit increases when growth demands.
- **Calorie goals on Strava cost double:** calories live only on the activity-detail endpoint (the list has just `kilojoules`), so each candidate activity is +1 read. Prefer distance/time goals as the promoted Strava conditions; calorie conditions work but are the expensive path.
- **Whoop `score_state`:** a just-finished workout may be `PENDING_SCORE` — strain/calorie conditions must re-check later (or wait for the `workout.updated` webhook) instead of treating unscored as failed.

**Webhook upgrade (post-v1, map says decide after polling rail works):** all four support webhooks, not just Strava — and all four send thin pointer payloads (IDs only, then fetch), HMAC/challenge-verified, terminating at the §10 backend. Priority order when the upgrade lands: **Whoop** (solves the pending-score re-poll) ≥ **Strava** (kills the scaling ceiling: fetch only on real events) > **Oura** (~30 s latency, covers daily_activity so step/calorie rates tick without opens) > **Polar** (covers EXERCISE + ACTIVITY_SUMMARY, but latency is gated on device→Flow sync anyway). Webhooks also carry deauth/delete events — the clean way to honor each vendor's revocation-deletion clauses.

---

## 3. Dedup-relevant fields (§3.5c cross-source guard)

The same physical workout must never pay twice (e.g. Strava also syncs to Apple Health). Per vendor, the fields to build the dedup key from:

| Vendor | Stable ID | Start time | Type | Duration | Extra evidence |
|---|---|---|---|---|---|
| Strava | `id`, `external_id`, `upload_id` | `start_date` (UTC) + `start_date_local` | `sport_type` | `moving_time` / `elapsed_time` | `device_name` (detail) |
| Oura | `id` | `start_datetime` (ISO w/ user's UTC offset) | `activity` (free string, **not** an enum) | `end_datetime − start_datetime` | `day`, `source` |
| Whoop | `id` (UUID; `v1_id` legacy) | `start` / `end` (UTC) | `sport_name` + `sport_id` | end − start | `score_state`, `score.percent_recorded` |
| Polar | `id` (hashed) | `start-time` (local) + `start-time-utc-offset` (minutes) | `sport` / `detailed-sport-info` | `duration` (ISO-8601) | `distance`, `device-id` |

**Recommended dedup key:** normalized activity family + **UTC start time bucketed to a ±3 min window** + duration within ±10%. Exact-ID matching across sources is impossible (each vendor mints its own IDs; only Strava exposes an `external_id` from the recording device), so time-window matching is the mechanism. Normalize everything to UTC first — Polar reports local time plus an offset field, Oura embeds the offset, Strava/Whoop are UTC-native. Type matching must be family-level (run/ride/swim/other), not string-equal: Oura's `activity` is free-text and each vendor has its own sport taxonomy. The **dedup window length is a §8 decision owed**; ±3 min start / same family is the evidence-backed starting point (auto-detected sources like Whoop trim start times versus manually started GPS recordings, so exact-start matching misses real duplicates).

---

## 4. Which catalog entries each vendor can power (§3.3)

| Catalog entry (kind) | Strava | Oura | Whoop | Polar |
|---|---|---|---|---|
| Step goal (event) / Steps exchange (rate) | ✗ (no steps in API) | ✓ `daily_activity.steps` | ✗ (no steps) | ✓ daily `steps` |
| Distance goal/exchange — run/ride/swim | ✓ `distance` per activity | ⚠ best-effort (`distance` nullable, no GPS) | ⚠ `distance_meter` on GPS sports only | ✓ exercise `distance` |
| Active-calorie goal/exchange | ⚠ detail-endpoint only (costly) | ✓ `active_calories` | ✓ `kilojoule` ÷ 4.184 | ✓ exercise `calories` + daily `active_calories` |
| Active-minutes goal/exchange | ✓ `moving_time` | ✓ high+medium activity time | ✓ workout durations / zones | ✓ `active_duration` |
| Finish any workout ≥ N min (event) | ✓ | ✓ workout start/end | ✓ | ✓ `duration` |
| **Whoop: Hit a strain target** (event, source-unique) | — | — | ✓ workout + day/cycle strain | — |
| *While walking* (state) & live signals | ✗ — no vendor powers live states; states stay Apple Health / on-device | | | |

⚠ = works with caveats — the picker should still offer it, but not as the promoted default for that source. Source-unique candidates beyond the PRD's list: Oura **readiness** (`daily_readiness.score`) is available under the same scopes if a "readiness" condition ever enters the catalog (not in v1's list; noting availability only).

**Practical pairing:** Strava = the run/ride/swim distance-and-time source; Oura = the steps/calories/minutes daily-totals source (plus readiness later); Whoop = strain + effort minutes/calories; Polar = the most complete single source (steps *and* distance *and* calories *and* minutes) with the lowest approval friction — but the weakest manual-entry filter, so its anti-cheat heuristic needs the §8 detail decision before launch.

---

## 5. Open items this research feeds into §8

- **Dedup window length** — recommend ±3 min start-time bucket + family-level type match (see §3).
- **Per-source manual-entry filter details** — Strava: `manual === false` && `trainer` handling; Oura: exclude `source === "manual"` (strictest: allow only `confirmed`/`workout_heart_rate`); Whoop: require `score_state === "SCORED"` (+ optional `percent_recorded` floor); Polar: require heart-rate data presence — **needs an empirical test of what a Flow manual entry returns**.
- **Strava rate-limit increase** — apply during the Strava app-review step; polling-only architecture caps out around ~50–100 DAU otherwise.
- **Approval runway** — Oura (10-user cap) and Whoop (10-member cap + review) approvals should be filed as soon as dev apps exist, well before TestFlight outgrows 10 testers per vendor. Strava app registration requires a paid Strava subscription (provisioning line item, §10.10).
