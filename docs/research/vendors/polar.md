# Polar AccessLink API — integration sheet

Researched 2026-07-28 against the live official docs at https://www.polar.com/accesslink-api/ (AccessLink 3.0, "v3"). All quotes below are verbatim from that page unless another URL is cited. A newer "Polar AccessLink Dynamic API v4" exists at https://www.polar.com/polar-api-v4/ but was not evaluated here; v3 is the fully documented, generally available API.

---

## 1. OAuth flow & scopes

Source: https://www.polar.com/accesslink-api/ (Authentication section)

- **Flow**: standard OAuth2 authorization-code. Documented sequence: user is redirected to Polar Flow's authorization endpoint → grants access → redirected back with `code` → partner exchanges code at the token endpoint → **partner must then register the user** before any data access.
- **Authorization endpoint**: `GET https://flow.polar.com/oauth2/authorization`
  - Params: `response_type=code` (only supported type), `client_id` (required), `redirect_uri` (optional — "Must be identical to the redirect URL given during Accesslink client registration or any other URL that has been added for the client"; multiple URLs can be registered in the admin page, with one flagged default), `scope` (optional), `state` (optional, CSRF).
- **Token endpoint**: `POST https://polarremote.com/v2/oauth2/token`
  - HTTP **Basic auth** with base64(`client_id:client_secret`) — this is why the exchange must happen on ExcerLock's backend proxy, never in the app.
  - Body: `grant_type=authorization_code&code=...` (+ `redirect_uri` if it was passed to the authorization endpoint).
  - Response: `access_token`, `token_type: "bearer"`, `expires_in`, `x_user_id` (Polar user id).
- **Scope model**: a single scope, `accesslink.read_all`. Docs: "Accesslink uses accesslink.read_all -scope, which allows access to user's data." If `scope` is omitted, "user will be asked to grant authorization for all scopes linked to client." There is no granular per-data-type scoping.
- **User registration quirk (verified)**: after OAuth, you MUST call `POST /v3/users` with body `{"member-id": "<your-own-user-id>"}` using the new bearer token. Docs: "Once partner has been authorized by user, partner must register the user before being able to access its data." Returns the user object (`polar-user-id`, names, birthdate, gender, etc.). **409 Conflict** = "User already registered to partner or duplicated member-id" — treat 409 as success-idempotent on re-link, but note member-id must be unique per partner. De-linking: `DELETE /v3/users/{user-id}` — "This will revoke the access token authorized by user" (204 on success).
- **Mobile redirect handling**: PKCE is **not documented/supported**; the confidential-client Basic-auth token exchange means the correct pattern for ExcerLock is: open the authorization URL in `ASWebAuthenticationSession`/expo-web-browser → redirect to an **https URL on the ExcerLock backend** (registered in the Polar admin page) → backend exchanges the code and stores the token → deep-link back to the app. Custom URL schemes are not mentioned in the docs; whether the admin console accepts non-https schemes is **unverified** — plan on https redirect to the proxy.

---

## 2. Token lifetimes & refresh

Source: https://www.polar.com/accesslink-api/ (Authentication → "Making requests")

- **Access token lifetime — verified non-expiring in practice**: "Access tokens will not expire unless explicitly revoked by partners or users." The token response's `expires_in` example is `31535999` seconds and the docs gloss it as "the access token will expire about one year from the time the response was generated" — but the operative doc statement is that tokens are not expired unless revoked. Treat `expires_in` as advisory; handle 401 by re-linking.
- **Refresh tokens: none.** The token response contains no `refresh_token` field. The only mention of "refresh token" anywhere in the docs is inside the boilerplate OAuth error description for `invalid_grant`. There is no documented refresh grant.
- Practical consequence for ExcerLock: store the access token server-side once; no refresh machinery needed. If a call returns 401/403, the user revoked access (or was de-registered) → prompt re-link.
- Two auth modes: user-token Bearer auth for `/v3/users/**` and `/v3/exercises`; **client-credentials Basic auth** (client_id:client_secret) for client-level resources (`/v3/notifications`, `/v3/webhooks`).

---

## 3. Rate limits

Source: https://www.polar.com/accesslink-api/ (Rate limiting section)

- Limits are **per partner (client), dynamic, scaling with registered user count**, recalculated daily — not fixed per-user quotas:
  - **15-minute limit**: `500 + (number of users × 20)`
  - **24-hour limit**: `5000 + (number of users × 100)`
  - "The short term limit is reset after 15 minutes have passed since first request is made and the long term limit is reset after 24 hours have passed since first request."
- **Headers on every response** (each value is `short,long` comma-separated integers):
  - `RateLimit-Usage` — current usage
  - `RateLimit-Limit` — limits
  - `RateLimit-Reset` — reset time in seconds
- **On exceed**: "Requests exceeding the limit will return 429 - Too Many Requests. Note that requests violating the short term limit will still count toward the long term limit."
- Budget check for ExcerLock's poll-on-open model: ~20 requests/user/15min and ~100/user/day headroom is generous (an app-open evaluation needs roughly 2–3 calls: exercises list + activity for today), but the proxy should centralize calls and back off on 429.

---

## 4. Endpoints & the transaction model

Source: https://www.polar.com/accesslink-api/ (Exercises, Daily activity, and the "(deprecated)" transaction sections)

### Architecture

AccessLink is **pull-based**. Two generations of endpoints coexist:

1. **Deprecated transactional model** (still documented, marked "(deprecated)"): `exercise-transactions`, `activity-transactions`, `physical-information-transactions`.
2. **Current non-transactional endpoints**: `GET /v3/exercises` and `GET /v3/users/activities` — plain repeatable reads, no commit.

### The transactional model (avoid — documented for completeness)

Exercise flow (activity is identical with `activity-transactions`):
1. `POST /v3/users/{user-id}/exercise-transactions` — "Check for new training data and create a new transaction if found." → **201** with `transaction-id`, or **204 No Content** "when there is no data available" (i.e. nothing new).
2. `GET /v3/users/{user-id}/exercise-transactions/{transaction-id}` — returns hyperlinks to each exercise within the transaction.
3. `GET .../exercises/{exercise-id}` — fetch each entity (plus FIT/TCX/GPX, heart-rate zones, samples sub-resources).
4. `PUT /v3/users/{user-id}/exercise-transactions/{transaction-id}` — commit. Doc verbatim: **"200 OK — Transaction has been committed and data deleted."**

**CRITICAL QUIRK (verified)**: a transaction only ever contains *new* data (data not delivered in a previously committed transaction), and committing **deletes that data from the transactional queue** — you cannot re-fetch it through the transaction API afterwards. If your server crashes after commit but before persisting, the data is gone from that path. Additional constraints on transaction creation: "Only data uploaded to Flow in the last 30 days will be available. Only data that has been uploaded to Flow after the user is registered with your client will be available."

### Current non-transactional endpoints (use these)

- **`GET /v3/exercises`** — "List users exercises available in AccessLink. **Only Exercises uploaded to Flow in the last 30 days are returned.** Only exercises that have been uploaded to Flow after the user is registered with your client will be returned." Optional query params `samples`, `zones` (route via `route` param on export/detail). Repeatable — no once-only semantics. **30-day history cap verified.**
- **`GET /v3/exercises/{exerciseId}`** — single exercise by **hashed id** (same 30-day window). Export: `GET /v3/exercises/{id}/fit|tcx|gpx`.
- **`GET /v3/users/activities`** — daily activity list. "When no date range is given, activities from the last 28 days are returned... From date cannot be older than 365 days from today and the maximum range between from and to is 28 days." Params: `from`, `to` (YYYY-MM-DD), `steps`, `activity_zones`, `inactivity_stamps`.
- **`GET /v3/users/activities/{date}`** — single day.
- **`GET /v3/notifications`** (client credentials) — "Pull notifications... check if their users have available data for downloading"; returns `{user-id, data-type, url}` entries. Cheap poll to know whether to bother fetching per-user.

### Exercise object (verified example from docs)

`id`, `upload-time`, `polar-user`, `transaction-id`, `device` (e.g. `"Polar M400"`), `device-id`, `start-time` (`"2008-10-13T10:40:02"` — **local time, no zone**), `start-time-utc-offset` (minutes, e.g. `180`), `duration` (**ISO8601**, `"PT2H44M45S"`), `calories` (kcal), `distance` (meters, e.g. `1600.2`), `heart-rate: {average, maximum}`, `training-load`, `sport` (e.g. `"OTHER"`), `has-route` (bool), `club-id`/`club-name`, `detailed-sport-info` (e.g. `"RUNNING"`), `fat/carbohydrate/protein-percentage`, `running-index`, `training-load-pro`.

### Daily activity object (verified example, current endpoint)

`start_time`, `end_time`, `active_duration` (ISO8601 `"PT3H11M"`), `inactive_duration`, `daily_activity` (percent of goal, e.g. `89.1`), `calories` (total, e.g. `2500`), `active_calories` (e.g. `1500`), `steps` (e.g. `8823`), `inactivity_alert_count`, `distance_from_steps` (meters), optional `samples` (step samples, activity zones, inactivity stamps). (The deprecated transactional activity object uses `date`, `created`, `calories`, `active-calories`, `duration`, `active-steps`.)

### ExcerLock condition → field mapping

| ExcerLock condition | Polar source | Fields |
|---|---|---|
| Distance goal/exchange (run/cycle/swim) | `GET /v3/exercises` | `distance` (m), filter on `sport` / `detailed-sport-info` (e.g. RUNNING, CYCLING, SWIMMING) |
| Calorie goal/exchange (workout) | `GET /v3/exercises` | `calories` |
| Calorie goal/exchange (daily active) | `GET /v3/users/activities/{date}` | `active_calories` (and total `calories`) |
| Active-minutes goal | `GET /v3/users/activities/{date}` | `active_duration` (ISO8601 duration) |
| Step goal/exchange | `GET /v3/users/activities/{date}` | `steps` (+ `distance_from_steps`) |
| "Any workout ≥ N minutes" | `GET /v3/exercises` | `duration` (ISO8601), any `sport` |
| Cross-source dedup | exercise object | `start-time` + `start-time-utc-offset`, `duration`, `sport`/`detailed-sport-info`, `distance`, hashed `id` (stable per exercise), `device-id` |

### What Polar CANNOT provide

- **No exercise history beyond 30 days** (upload-time based) and no activity data older than 365 days; backfill for long-lapsed users is impossible for workouts.
- **Data only after user registration with your client** — nothing retroactive from before link.
- **No manual/source flag on exercises** (see §5).
- **No real-time/intraday push** — data appears only after the user's device syncs to Polar Flow; a lunchtime step count reflects the last sync.
- **No granular scopes** — all-or-nothing `accesslink.read_all`.
- Fields like `heart-rate`, `distance`, `running-index` are optional in the schema — absent when the device/sport didn't record them (e.g. no distance for strength training).

---

## 5. Manual-entry detection

Sources: https://support.polar.com/en/support/how_do_i_add_a_training_session_to_polar_flow_web_service_manually_0 ; https://www.polar.com/accesslink-api/

- **Yes, Polar Flow allows manual exercise logging.** Official support doc: in the Flow web service, "go to your DIARY and click Add > Training session... enter Date and Time and select Sport" — users can freely enter sport, date/time, duration, and metrics like distance and calories.
- **The API does NOT expose a manual/source flag.** The word "manual" does not appear anywhere in the AccessLink API documentation (verified by full-text search of the docs page). There is no `source`, `origin`, or `is_manual` field in the exercise schema.
- **Honest anti-cheat implication**: a manually typed 10 km "run" is indistinguishable *by any documented flag* from a device-recorded one. Heuristics ExcerLock can use (all inferential, none doc-guaranteed):
  - `device` / `device-id` — device-recorded sessions carry a device name (`"Polar M400"`); what a manual entry shows here is **not documented** — must be verified empirically with a test account before relying on it.
  - Presence of `heart-rate.average/maximum`, heart-rate `samples`, and `zones` — manual entries have no sensor data.
  - `has-route: true` implies GPS recording (manual entries can't have routes).
  - `running-index` / `training-load` presence implies real recorded effort data.
  - Recommended policy: require HR data or `has-route` for high-value exchanges; flag zero-sensor-data sessions for reduced credit, consistent with the cross-vendor anti-cheat approach.

---

## 6. Webhooks

Source: https://www.polar.com/accesslink-api/ (Webhooks section)

- **Supported, one webhook per client**: "Client application can only have one webhook registered." Managed with client-credentials Basic auth.
- **Registration**: `POST https://www.polaraccesslink.com/v3/webhooks` with `{"events": ["EXERCISE", ...], "url": "https://..."}` → 201 with webhook object including **`signature_secret_key`** — "not available after create so make sure to save the key when creating webhook." 409 if a webhook already exists. Also: `GET`, `PATCH` (update), `DELETE`, plus explicit activate/deactivate endpoints.
- **Validation**: on create, AccessLink sends a **PING** message to the URL; endpoint must return HTTP 200.
- **Event types**: `EXERCISE`, `SLEEP`, `CONTINUOUS_HEART_RATE`, `SLEEP_WISE_CIRCADIAN_BEDTIME`, `SLEEP_WISE_ALERTNESS`, **`ACTIVITY_SUMMARY`** (daily activity IS covered), `PHYSICAL_INFORMATION`, plus `PING`.
- **Payload shape** (EXERCISE, verbatim example): `{"event": "EXERCISE", "user_id": 475, "entity_id": "aQlC83", "timestamp": "2018-05-15T14:22:24Z", "url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"}` — the payload is a pointer; fetch the entity at `url`. ACTIVITY_SUMMARY payload carries `date` instead of `entity_id`.
- **Signature**: every payload signed with **HMAC SHA-256** using the `signature_secret_key`; delivered in the **`Polar-Webhook-Signature`** header. Verify on the proxy.
- **Reliability**: "Webhook will be automatically deactivated if push notifications have not been successful for a period of seven (7) days" — must monitor and call the activate endpoint to recover.
- **Latency**: not documented. Events fire when new data becomes available in AccessLink, i.e. after the user's device/app syncs to Polar Flow — so effective latency is dominated by sync time, not webhook delivery. ExcerLock's app-open polling remains the primary evaluation path; webhooks are an optimization.

---

## 7. ToS & branding restrictions

Sources: https://www.polar.com/en/legal/polar-api-agreement (Polar API License Agreement); registration at https://admin.polaraccesslink.com requires accepting the AccessLink Limited License Agreement (full text only visible at signup — not independently fetchable; unverified beyond that).

- **Attribution required**: partners "shall credit Polar Ecosystem as the source of Data when displaying any Data" (§3.1.5). ExcerLock must label Polar-derived numbers as from Polar.
- **Branding restricted**: "may not use Polar, Polar logo, Polar's product names... without Polar's specific written consent" (§7.4) — attribution text yes, logo/marketing use no (without consent).
- **Consent & disclosure**: data may be used "only pursuant to the Member's explicit authorization" (§3.1.1); data practices must be disclosed to users (§3.1.4).
- **Revocation/deletion**: on user revoke or relationship end, partner must "cease... access to the Member's account(s), revoke the token issued by Polar... and delete related token(s)" (§3.3); on agreement termination, "destroy and delete all copies of the Licensed Materials and Data" (§8.4). No numeric retention window is specified for normal operation.
- **No competing service**: prohibited to "use the Licensed Materials in creating a service similar to or competing with Polar Ecosystem" (§2.2). ExcerLock (screen-time lock) is not a training-platform competitor — low risk.
- **Termination**: Polar may terminate "for any or no reason, with immediate effect" (§8.3). API currently free; "Polar reserves the right to charge fees from time to time" (§6).
- No explicit clauses found on health/medical claims, data resale, or cross-source aggregation; absence verified only within the API License Agreement text summarized above.

---

## 8. Production approval

Sources: https://admin.polaraccesslink.com/ ; https://www.polar.com/accesslink-api/ (Getting started); https://www.polar.com/blog/introducing-polar-open-accesslink-api/

- **Self-service**: any registered Polar Flow account can log in to **https://admin.polaraccesslink.com** and create an API client by filling in application/organization details, OAuth2 redirect URL(s), and accepting the AccessLink Limited License Agreement. Client id + secret are issued immediately.
- **No review/approval process is documented** — no app review, no production tier, no user-count gate. The API is free ("Polar Open AccessLink is free to use... open to all developers").
- **Limits**: rate limits scale automatically with registered users (§3); one webhook per client. No documented cap on number of clients per account or users per client — **unverified** whether any soft caps exist.
- Friction assessment: **LOW** — the lowest of the major fitness vendors (no equivalent of Strava/Fitbit production review).

---

## 9. Key facts table

| Fact | Value |
|---|---|
| Auth type | OAuth2 authorization-code, confidential client (Basic auth token exchange, backend proxy required); no PKCE documented |
| Scope | `accesslink.read_all` (single, all-or-nothing) |
| Token TTL | Effectively non-expiring — "will not expire unless explicitly revoked" (`expires_in` ≈ 1 year advisory) |
| Refresh token | None |
| Post-OAuth quirk | Must `POST /v3/users` (member-id) before any data access; 409 = already registered |
| Rate limit | Per client, dynamic: 15 min = 500 + 20/user; 24 h = 5000 + 100/user; `RateLimit-Usage/Limit/Reset` headers; 429 on exceed |
| Webhooks | Yes — EXERCISE, ACTIVITY_SUMMARY, SLEEP, CONTINUOUS_HEART_RATE, SLEEPWISE×2, PHYSICAL_INFORMATION; HMAC-SHA256 `Polar-Webhook-Signature`; 1 webhook/client; auto-deactivates after 7 failed days |
| Exercise history | 30 days (upload-time), only post-registration data; activity ≤ 365 days back, 28-day max range |
| Transaction gotcha | Legacy transactional endpoints delete data on commit (once-only); use non-transactional `GET /v3/exercises` + `/v3/users/activities` instead |
| Manual-entry flag | No — Flow allows manual sessions; API has no source/manual field; heuristics: HR presence, `has-route`, `device` |
| Signals | Distance Y (per-exercise), calories Y (exercise + daily active), active minutes Y (`active_duration`), steps Y, workout≥N-min Y |
| Dedup fields | hashed exercise `id`, `start-time`+`start-time-utc-offset`, `duration`, `sport`/`detailed-sport-info`, `distance`, `device-id` |
| Approval friction | Low — self-service at admin.polaraccesslink.com, no review |
