# ExcerLock — Phase 2 Plan Inventory

Read-only audit. Every claim below cites `path:line`. "Absent" means I opened the named
directory/file and the thing is not there.

## 0. Sources read in full

| File | Lines |
| --- | --- |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/README.md` | 44 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T01-supabase-auth.md` | 39 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T02-server.md` | 59 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T03-port-native-engine.md` | 50 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md` | 51 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md` | 65 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T06-adapty.md` | 35 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T07-posthog-sentry.md` | 29 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T08-sync.md` | 30 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T09-notifications.md` | 21 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md` | 23 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T11-device-verification.md` | 31 |
| `/Users/johansardar/ExcerLock/plans/rebuild/phase-2-backend/P2-T12-cutover.md` | 27 |
| `/Users/johansardar/ExcerLock/plans/rebuild/04-architecture.md` | 158 |
| `/Users/johansardar/ExcerLock/docs/research/device-activity-gaps.md` | 86 |
| `/Users/johansardar/ExcerLock/docs/research/familycontrols-on-simulator.md` | 177 |
| `/Users/johansardar/ExcerLock/docs/research/healthkit-coverage.md` | 88 |
| `/Users/johansardar/ExcerLock/docs/research/device-access.md` | 155 |
| `/Users/johansardar/ExcerLock/docs/handoffs/gym-location-picker-build.md` | 118 |
| `/Users/johansardar/ExcerLock/docs/handoffs/onboarding-ui-integration.md` | 162 |

`/Users/johansardar/ExcerLock/docs/handoffs/` contains exactly those two `.md` files — checked with `ls`.

Supporting reads for the "does a screen exist?" column: `plans/rebuild/02-screen-inventory.md`,
`plans/rebuild/00-decisions.md`, `app-next/app/**`, `app-next/src/ports/**`, `app-next/src/content/**`,
`app-next/app.json`, `app-next/modules/**`.

---

## 1. Phase 2 shape, gates and prerequisites

Phase 2 **starts only when Johan says "go" after reviewing Phase 1**; nothing in the folder is built before
that (`plans/rebuild/phase-2-backend/README.md:3-4`).

Goal statement: every fake port replaced by a real adapter — verified native engine ported from `app/`
(Screen Time, Core Motion, gait vision, placement, walking sessions, gym geofencing, HealthKit), Supabase
auth, VPS API on Supabase JWTs, Adapty with the Paywall Builder, PostHog, Sentry, local notifications, and
sync of rules and results to the VPS, verified on a physical iPhone
(`plans/rebuild/phase-2-backend/README.md:6-10`).

### Principles (README.md:12-25)

- **Port, don't rewrite** (decision B12). Codex changes wiring and policy, not internals
  (`README.md:14-17`).
- **Ports are the contract.** A real adapter passes the same port-level tests the fake passed.
  "Screens do not change in Phase 2 except where a real system UI replaces a fake sheet (app picker,
  permission prompts, Paywall Builder)" (`README.md:18-20`). ← This single sentence is the source of most of
  the "no screen yet" gaps listed in §3, because several Phase 2 tasks do in fact introduce new user-visible
  states.
- **Local-first law stays** — earning and locking never depend on the network or an account
  (`README.md:21`).
- **One identity spine**: Supabase user id = `users.id` on the VPS = Adapty `customer_user_id` = PostHog
  `distinct_id`; anonymous Supabase user from day one, survives linking (`README.md:22-24`).
- **Device evidence or it did not happen** (`README.md:25`).

### Milestones and gates (README.md:29-34)

| Milestone | Tasks | Gate |
| --- | --- | --- |
| N0 Identity and server | T01, T02 | Server tests green; app signs in with Apple/Google/email against dev Supabase; `PUT /v1/user` provisions (`README.md:31`) |
| N1 Native engine port | T03, T04, T05 | Simulator: FamilyControls authorizes, picker returns a handle, `resolveLock` drives ManagedSettings; harness app root boots (`README.md:32`) |
| N2 Services | T06, T07, T08, T09, T10 | Sandbox purchase round-trips through Adapty to the webhook; events land in PostHog with the right distinct id (`README.md:33`) |
| N3 Device and cutover | T11, T12 | Johan's phone: full flow, shields on a real app, unlock by walking, gym arrival, run from Health, trial via sandbox (`README.md:34`) |

### Prerequisites Johan owns (README.md:36-44)

1. Create the Supabase project (D1/Q5); give Codex project ref, anon key and a **dev** service role/access
   token in `~/.excerlock/env`, never in the repo; enable Apple, Google, Email-OTP providers **and anonymous
   sign-ins**; register the Apple Services ID and Google OAuth client (`README.md:38-41`).
2. Configure the Adapty Paywall Builder for placements `onboarding` and `in_app` with the real products
   (Variant A/B groups exist); confirm no live customers are linked by Clerk id (E5) (`README.md:41-42`).
3. Point `api.excerlock.com` DNS at the VPS if still unpointed (`README.md:43`).
4. Physical iPhone, iOS ≥ 17.4, developer mode on, connected, for P2-T11 (`README.md:44`).

---

## 2. The port ↔ adapter map the plan assumes

From `plans/rebuild/04-architecture.md:63-76` (the Phase 1 ↔ Phase 2 boundary table):

| Port | Phase 2 real adapter | Owning Phase 2 task |
| --- | --- | --- |
| `ScreenTimePort` | `app/src/screentime/native/*` + `app/targets/*` (`04-architecture.md:65`) | P2-T03 (move), P2-T04 (policy) |
| `StepsPort` | `app/modules/excerlock-motion` + `app/src/signals/motion` (`04-architecture.md:66`) | P2-T05 §1 |
| `WalkingPort` | `walkingSessionController.ts`, `signals/gait`, `signals/placement`, `modules/excerlock-gait-vision` (`04-architecture.md:67`) | P2-T05 §2 |
| `GymPort` | `app/src/signals/location/*`, `gymPresenceController.ts`; map search new (`04-architecture.md:68`) | P2-T05 §3 |
| `HealthPort` | `app/src/signals/health/*` (kingstinct HealthKit 14.0.2 + patch + background bootstrap) (`04-architecture.md:69`) | P2-T05 §4 |
| `AuthPort` | Supabase (new) (`04-architecture.md:70`) | P2-T01 |
| `SubscriptionPort` | Adapty + Paywall Builder (`04-architecture.md:71`) | P2-T06 |
| `AnalyticsPort` | PostHog via `packages/analytics-events` (`04-architecture.md:72`) | P2-T07 |
| `NotificationsPort` | expo-notifications local, reduced (`04-architecture.md:73`) | P2-T09 |
| `SyncPort` | VPS API, new endpoints (`04-architecture.md:74`) | P2-T02 + P2-T08 |
| `ClockPort` | system (`04-architecture.md:75`) | none named |

Ports that exist in the built app but are **not** in the architecture table and are **not named by any Phase 2
task file** (checked `/Users/johansardar/ExcerLock/app-next/src/ports/`):

- `GaitPort` (`app-next/src/ports/GaitPort.ts:1-7`) — camera preview + camera permission for the treadmill
  aha screen. P2-T05:16-17 mentions `GaitVisionPreviewView` inside the `WalkingAdapter` bullet but never
  names `GaitPort` or who supplies `Preview` / `permission()`.
- `PlaceSearch` (`app-next/src/ports/PlaceSearch.ts:4-10`) — the five search methods. P2-T05:26-38 does
  implement exactly these five behind `modules/expo-local-search`, but calls them "the five search methods"
  rather than the port name.
- `SupportPort` (`app-next/src/ports/SupportPort.ts:1-3`) — P2-T10:13 says "real `POST /v1/support` with retry
  semantics ported from `app/src/support`" without naming the port.
- `RuntimeControls` (`app-next/src/ports/RuntimeControls.ts`) — dev-menu control surface; no Phase 2 task
  says what happens to it in a production build. `plans/rebuild/02-screen-inventory.md:171` says the dev menu
  is "Phase 1 always; Phase 2 only in dev builds", but no task implements that gating.

**`SyncPort` is narrower than the plan requires.** The shipped interface is
`pushRules`, `pushRuleDays`, `pull()` returning `{ rules, ruleDays }`
(`app-next/src/ports/SyncPort.ts:2-6`). P2-T02:40-42 and P2-T08 require additionally `usage_days` and
`profile` push and a `GET /sync` that returns profile + usage days. The port will have to grow, which
contradicts README.md:18 ("a real adapter passes the same port-level tests the fake passed").

---

## 3. Task-by-task inventory

Legend for the UI columns:
**Assumes UI exists** = a screen/copy already specified in `plans/rebuild/02-screen-inventory.md` or built in
`app-next/`. **No screen/copy yet** = I checked `plans/rebuild/02-screen-inventory.md` and
`/Users/johansardar/ExcerLock/app-next/src/content/` and `/Users/johansardar/ExcerLock/app-next/app/` and did
not find it.

---

### P2-T01 — Supabase auth in the app (`AuthPort` real adapter)

**Delivers** (`P2-T01-supabase-auth.md:19-31`)
- `src/auth/SupabaseAuthAdapter.ts` implementing `AuthPort`; `src/auth/supabaseClient.ts` reading URL + anon
  key from `app.config.ts` `extra` with the `~/.excerlock/env` fallback; session persistence, auto-refresh,
  app-state foreground refresh (`:19-21`).
- Provisioning: on **any** session, anonymous included, call the server's idempotent `PUT /v1/user` with the
  Supabase access token *before* reporting `signedIn`; handle `410 ACCOUNT_DELETED` by signing out locally and
  starting a fresh anonymous session (`:22-24`).
- Config: `app.json` gains `expo-apple-authentication` (entitlement `com.apple.developer.applesignin`) and the
  Google URL scheme, verified via Expo MCP (`:30-31`).

**Ports/adapters implemented:** `AuthPort` → `SupabaseAuthAdapter` (`:19`). Facts: Supabase is auth only —
no Supabase tables, no RLS, no Edge Functions (`:5`). Sign-in methods Apple, Google, email OTP (`:6`).
Anonymous session from first launch; `linkIdentity` keeps the same uid (`:6-7`, `:17`). The old
`AccountModule` shape maps onto `AuthPort` and the deletion ordering law (Adapty → PostHog → auth provider
last) is kept (`:8-9`).
Secure storage law: `expo-secure-store` for the refresh token; **AsyncStorage is not acceptable for tokens**
(`:15-16`).

**Assumes UI already exists**
- X4 "Save your progress" (Apple / Google / email → OTP code screen, "Skip for now") —
  `02-screen-inventory.md:107`; built as `app-next/app/sign-in.tsx` and `app-next/app/setup/[step].tsx`.
- Settings › Account (sign in / sign out / delete with the five-point explanation) —
  `02-screen-inventory.md:170`, `app-next/app/settings/account.tsx`,
  copy in `app-next/src/content/settings.ts:96-107`.
- Explicitly named by the task: "Screens: X4 and Settings › Account now call the real port; the email code
  screen uses real OTP; Apple button uses the native `AppleAuthentication.AppleAuthenticationButton`"
  (`:28-29`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **`410 ACCOUNT_DELETED` recovery** (`:23-24`). The user is silently signed out and dropped into a new
   anonymous session. No copy exists — grep of `app-next/src/content/` finds only
   `settingsCopy.deleted` (`src/content/settings.ts:107`), which is the *local* delete-confirmation string,
   not a "your account was deleted elsewhere" state. Absent.
2. **Provisioning failure / offline first launch.** `PUT /v1/user` gates reporting `signedIn` (`:22-23`);
   nothing says what the boot gate L1 (`02-screen-inventory.md:15`, 3 s budget) shows if the VPS is
   unreachable. No copy in `app-next/src/content/`. Absent.
3. **Native Apple sign-in button swap** (`:29`). The Phase 1 X4 rows are `ChoiceRow`-style; replacing one with
   `AppleAuthenticationButton` is a visual change that README.md:18-20 says should not happen.
4. **Identity-link conflict** — signing in with Apple on device B where the anonymous uid already has server
   rows. `linkIdentity` (`:17`) keeps the uid, but the merge story lives in P2-T08 with no UI (see there).

**Acceptance checklist** (`:35-39`)
- [ ] Fresh install → anonymous session → `PUT /v1/user` provisions a row keyed by the anonymous uid.
- [ ] Apple, Google and email OTP each link to the same uid (dashboard: one user, three identities) on the dev
      Supabase project.
- [ ] Sign out → new anonymous session; rules untouched (local-first test).
- [ ] No token ever touches AsyncStorage or logs (grep test).

**Repo-state note:** the task reads config from `app.config.ts` `extra` (`:19-20`); **there is no
`app.config.ts` in `/Users/johansardar/ExcerLock/app-next/`** — only `app.json` (`app-next/app.json:1-52`).
Same assumption in P2-T06:7.

---

### P2-T02 — VPS server: Supabase JWTs, schema, sync endpoints, Clerk and vendor removal

**Delivers**
- **Auth rewrite** (`P2-T02-server.md:13-20`): `server/src/auth.ts` verifies Supabase access tokens; check the
  current Supabase JWT signing scheme (asymmetric JWKS at
  `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` ES256/RS256, or legacy HS256 shared secret) and
  support whichever the project uses; identity = `{ userId: payload.sub, isAnonymous: payload.is_anonymous === true }`;
  rename `clerkIdentity` → `authIdentity`, `clerk_deleted_at` → `auth_deleted_at` (migration); new env
  `SUPABASE_URL`, `SUPABASE_JWT_JWKS_URL` or `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (deletion
  only); remove `CLERK_SECRET_KEY` from `env.ts`, `deploy/cloud-init.yaml`, README.
- **Deletion** (`:21-22`): `userDeletion/httpGateway.ts` deletes the Supabase user via the Admin API with the
  service-role key, **last** in the ordering (Adapty → PostHog → Supabase).
- **Schema, Drizzle migration 0006+** (`:23-34`): drop `vendor_connections`, `vendor_oauth_states`,
  `vendor_webhook_events`; drop `feature_requests`, `feature_request_votes` (B17; keep `support_requests`);
  add `rules`, `rule_days`, `usage_days`, `profiles` with the exact columns at `:25-31`.
  Privacy law: **no app names, no bundle ids, no location coordinates, no health samples**;
  `rule_days.progress` is an aggregate in the rule's own unit; **gym place names and coordinates stay on the
  device** and never leave (`:32-34`).
- **Endpoints** under `/v1` (`:35-43`): keep `GET /health`, `GET /ready`, `POST /webhooks/adapty`,
  `PUT /user`, `DELETE /user`, `POST /support`; implement `GET /user` (was 501); add `PUT /sync/rules`
  (full replacement, `updated_at` last-write-wins per rule), `PUT /sync/rule-days` (upsert batch, max 400),
  `PUT /sync/usage-days`, `PUT /sync/profile`, `GET /sync` (rules + last 400 rule_days + last 400 usage_days +
  profile) for restore on a new device; delete all vendor routes and `routes/vendorWebhooks.ts`.
- **Server analytics** (`:44-46`): `services/analytics.ts` unchanged; `support_request_submitted` and
  `account_deleted` stay server-owned; `data_export_requested` and `diagnostics_shared` remain defined but
  unemitted unless the feature exists.
- **Tests with pglite** (`:47-49`): auth (valid, expired, wrong issuer, anonymous), every endpoint, migration
  up on a 0005 database, deletion ordering, sync last-write-wins, batch limits, RLS-equivalent ownership
  checks (a user can never read or write another user's rows).
- **Deploy** (`:50-51`): `deploy/deploy.sh` mechanism unchanged; `/etc/excerlock/env` gets the new vars, Johan
  applies on the box; run `/v1/ready` after deploy.

**Ports/adapters:** none client-side; this is the server half of `SyncPort` and of `AuthPort`'s provisioning
and deletion calls.

**Assumes UI already exists**
- Settings › Support composer → `POST /v1/support` (`02-screen-inventory.md:168`,
  `app-next/app/settings/support.tsx`, copy `app-next/src/content/settings.ts:90-95`).
- Settings › Account › Delete account → `DELETE /v1/user` (`02-screen-inventory.md:170`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **Nothing directly** — but note the **profile** table (`:30-31`) stores onboarding answers
   (`name`, `referral_source`, `age_band`, `occupation`, `improve_first`, `main_reason`,
   `estimated_daily_minutes`, `units`). Onboarding O04–O10 collects these (`02-screen-inventory.md:28-34`)
   with no consent/disclosure copy about them leaving the device. The only privacy copy in the app is
   `legalCopy` (`app-next/src/content/legal.ts:1-19`), which is explicitly placeholder text and says
   "Your conditions and progress remain on this device" (`legal.ts:16`) — which will be **false** once
   P2-T08 syncs them. Flagged as a copy contradiction, not merely a gap.
2. **Batch limit 400 rows** (`:40-41`) — a user with more history than fits silently truncates on restore
   (`GET /sync` returns "last 400"). No UI says the restore is partial. Absent.

**Acceptance checklist** (`:55-59`)
- [ ] `npm test --workspace server` green; `npm run typecheck` green; migration applies to a copy of prod
      schema.
- [ ] Deployed to the VPS; `curl https://api.excerlock.com/v1/ready` → 200; a Supabase dev token hits
      `GET /v1/user` → 200; a Clerk-style token → 401.
- [ ] Vendor code, tables and docs references gone (`grep -ri strava server/src` empty).

---

### P2-T03 — Port the native engine, plugins, targets, harness and guardrails into `app-next`

**Delivers** — a file move table (`P2-T03-port-native-engine.md:8-20`), verbatim:

| From `app/` | To `app-next/` | Line |
| --- | --- | --- |
| `modules/excerlock-motion/**`, `modules/excerlock-gait-vision/**` | `modules/` (same names, `app.plugin.js` paths updated) | `:9` |
| `plugins/withNoPush.js`, `withScreenTimeExtensionValidation.js`, `withHealthKitBackgroundBootstrap.js`, `plugins/healthkit/HealthKitBackgroundBootstrap.mm` | `plugins/` | `:10` |
| `targets/DeviceActivityMonitorExtension`, `targets/ShieldAction`, `targets/ShieldConfiguration` (+ FOUNDRY/README) | `targets/` — app group `group.com.johansardar.excerlock`, team `AX3C2B78YD`, iOS 17.4 unchanged | `:11` |
| `patches/@kingstinct+react-native-healthkit+14.0.2.patch` | `patches/` + `patch-package` postinstall | `:12` |
| `src/screentime/**` | `src/engine/screentime/` | `:13` |
| `src/signals/{motion,gait,placement,location,health,timeline}/**` + fixtures | `src/engine/signals/` (drop `signals/vendor`; drop `signals/screentime` if only the ledger used it) | `:14` |
| `src/home/signals/walkingSessionController.ts`, `gymPresenceController.ts` + tests | `src/engine/walking/`, `src/engine/gym/` | `:15` |
| `src/shield/**` | `src/engine/shield/` | `:16` |
| `src/harness/**`, `src/diagnostics/**`, `scripts/analyze-harness-run.js`, `tools/gait-fixture-extractor` | `src/harness/`, `src/diagnostics/`, `scripts/`, root `tools/` | `:17` |
| `src/e2e/**` scenario deep-link entry | `src/e2e/` reduced to deep-link → dev-menu scenario loader | `:18` |
| `src/observability/**` | `src/observability/` | `:19` |
| guardrails (`plugin-order`, `app-delegate`, `native-targets.json`, `rnda-imports`, `shield-content`, `motion-module`, `location-config`, `min-ios`, `prebuild-survival`, `phase3-production-callers`, `single-emitter`) | `guardrails/` re-pointed at `app-next` | `:20` |

**The load-bearing plugin order** (`:24-31`): `./plugins/withNoPush` → `expo-router` → `expo-dev-client` →
`expo-splash-screen` → `expo-build-properties` (17.4) → `react-native-device-activity` (appGroup,
`copyToTargetFolder: false`) → `@kingstinct/react-native-healthkit` →
`./plugins/withHealthKitBackgroundBootstrap` → `expo-location` (background) →
`./modules/excerlock-motion/app.plugin.js` → `./modules/excerlock-gait-vision/app.plugin.js` →
`expo-secure-store` → `expo-apple-authentication` → `@sentry/react-native` → `react-native-adapty` →
`./plugins/withScreenTimeExtensionValidation` (last).
Usage strings: Camera, Health share, Location When-in-use and Always, Motion.
`UIBackgroundModes: fetch, location`. Entitlements: family-controls, healthkit, healthkit background
delivery, app group, applesignin. **No `aps-environment`** (guardrail) (`:29-31`).

Dependencies via Expo MCP (`:32-34`): `react-native-device-activity` (same major, check for newer),
`@kingstinct/react-native-healthkit` **14.0.2 exact** with the patch, `expo-location`, `expo-task-manager`,
`expo-camera` only if the gait module requires it (it uses AVFoundation directly; check its podspec).
Order of work: copy files, fix imports, get typecheck and moved tests green **before** any wiring (`:35`).
Prebuild must produce the three `.appex` targets and entitlements or
`withScreenTimeExtensionValidation` fails the build (`:36-37`).
Harness root behind `EXPO_PUBLIC_TEST_HARNESS=1` in `app/_layout.tsx` (`:38`).

**Ports/adapters:** none directly — this is the substrate P2-T04 and P2-T05 wire to ports.

**Assumes UI already exists:** the harness app root (a separate app root, `04-architecture.md:130`) and the
dev-menu scenario deep-link entry (`02-screen-inventory.md:113-115`, `app-next/app/dev.tsx`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **Nothing user-facing by design** — but note the plugin list adds `expo-camera` conditionally (`:34`) and a
   Camera usage string (`:29`); the Camera permission row already exists
   (`02-screen-inventory.md:165`, `app-next/src/content/settings.ts:63`, `:71`, `:79`).
2. **`react-native-maps` is not in the plugin order at `:24-28`** even though the gym picker was built on it
   (`docs/handoffs/gym-location-picker-build.md:25`) and it is currently plugin #2 in
   `app-next/app.json:23`. Nothing in P2-T03 says where it slots relative to
   `withScreenTimeExtensionValidation`. Open.

**Acceptance checklist** (`:44-50`)
- [ ] All moved test suites pass unchanged (count them; list any test that needed editing and why).
- [ ] Clean prebuild produces `DeviceActivityMonitorExtension.appex`, `ShieldAction.appex`,
      `ShieldConfiguration.appex`; guardrails green.
- [ ] Simulator dev-client build launches; FamilyControls authorization completes (silently on simulator, as
      measured 2026-08-04); harness root boots with the env flag.
- [ ] `~/ios-app-pitfalls/PITFALLS.md` consulted for Screen Time / HealthKit / Expo prebuild entries before
      debugging; any new cross-app pitfall logged with the `log-pitfall` skill.

**Repo-state note:** `app-next/modules/excerlock-gait-vision/` already exists with full Swift
(`ios/GaitVisionService.swift`, `ios/GaitVisionPreviewView.swift`, `app.plugin.js`), and
`app-next/app.json:22` already lists `./modules/excerlock-gait-vision/app.plugin.js`. Phase 2 work has
already partly happened inside Phase 1. `app-next/modules/excerlock-motion/` is **absent** (checked
`app-next/modules/`, which contains only `excerlock-gait-vision` and `expo-local-search`).
The current `app-next/app.json:21-42` plugin list is `gait-vision → react-native-maps → expo-router →
expo-splash-screen → expo-font → expo-build-properties` — it does **not** match the load-bearing order at
`P2-T03:24-28` and has no `withNoPush` first, so the `plugin-order` guardrail will need the whole list
rewritten, not appended to.

---

### P2-T04 — `resolveLock` drives Screen Time; usage monitor; shield content

**Delivers** (`P2-T04-lock-policy-on-screen-time.md:8-28`)
- `ScreenTimeAdapter implements ScreenTimePort` wrapping `src/engine/screentime/native/*` (`:8`).
  - `applyLock(decision)`: `locked` → apply ManagedSettings shield to the stored selection; any unlocked state
    → clear shields; idempotent; last applied decision cached in the app group (`:9-11`).
  - **Schedules**: for each enabled rule's window instances over the next 7 days, register DeviceActivity
    schedules (`intervalStart`/`intervalEnd`, repeating weekly) so the monitor extension re-applies shields at
    window start and clears at window end **without the app running**; the extension reads "met today" and
    "walking lease" from the app group to decide whether to shield at interval start (`:11-15`).
  - **Walking lease** (state mode): renewable 15-minute DeviceActivity interval
    (`planWalkIncrement`, `extendWalkIncrement` ported); lease expiry in the extension re-shields and posts the
    walk-lease warning 30 s before (P2-T09) (`:16-18`).
  - **Met today**: app writes `{ day, until: relockAt }` to the app group and clears shields; the extension
    honors it at any later interval start the same day (`:19-20`).
  - **`observeUsage()`** (decision B15): daily DeviceActivity monitor on the locked selection with cumulative
    threshold events every 5 minutes of usage, `includesPastActivity: true`; each event increments the
    app-group usage counter; the app reads it into `usage_days`. **Documented limitation: minute resolution is
    5, and days the extension was not scheduled show as unmeasured** (`:20-23`).
- **Shield content** (`:24-27`): `ShieldConfigurationExtension.swift` reads the content model published by
  `src/engine/shield/nativeShieldContentPublisher.ts` from `domain/shieldContent` (strings from Phase 1 T13).
  Causes reduced to `locked`, `lockWindow` (interval start), `walkingEnded`. `ShieldAction` keeps the
  **deep-link notification workaround** and the two URLs (`excerlock://`, `excerlock://locked-apps` → Home).
- **Precedence lives only in `domain/resolveLock`. The engine never decides; it applies** (`:28`).
- Steps (`:31-41`): port `screentime/native`, adapt `NativeShieldScheduler` to window instances (tests first
  with the existing `deviceActivitySchedule.ts` helpers); app-group facts (`met`, `walkLease`, `usageDay`)
  with versioned keys read by `ShieldLockWindowContext.swift`; `useLockDecision()` effect calling `applyLock`
  on every change and re-registering schedules when rules change, **at midnight, and on timezone change**;
  usage monitor + `usage_days` store feeding Analytics; adapter contract tests plus schedule generation for
  weekday sets, cross-midnight and all-day, and a Swift-mirrored decision-table test.

**Ports/adapters:** `ScreenTimePort` → `ScreenTimeAdapter` (`:8`). This replaces the ledger's
`desiredOsState` contract; the old drain ladder, holidays and walk-window scheduling go away (`:3-4`).

**Assumes UI already exists**
- Home `StatusCard` states `locked`, `unlockedMet`, `unlockedWalking`, `beforeWindow`, `afterWindow`,
  `noRulesToday`, permission override (`02-screen-inventory.md:119-126`, copy
  `app-next/src/content/home.ts:6-15`).
- The lease countdown and Stop button on `unlockedWalking` (`02-screen-inventory.md:123`,
  `home.ts:33`, `:38`).
- The shield content model and copy from Phase 1 T13 — `ShieldPreview` screen in the dev menu
  (`02-screen-inventory.md:189-192`); real strings live at
  `app-next/src/content/sessions.ts:38-47` (`shieldTitle`, `shieldOpen`, `shieldKeep`, `shieldOkay`,
  `shieldFallback`, `shieldEnded`, `shieldWalk`, `shieldArrive`, `shieldProgress`, `causes`).
- Analytics "measured on N of M days" line and the "no measurement yet" empty state
  (`02-screen-inventory.md:150`, `:154`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **Shield button targets.** `:26-27` names two deep-link URLs, `excerlock://` and
   `excerlock://locked-apps` → Home. `grep -rn "locked-apps"` across `/Users/johansardar/ExcerLock/app-next`
   returns nothing, and there is no route file for it — `app-next/app/` contains no `locked-apps` route
   (full route listing: `_layout`, `index`, `(tabs)/{home,conditions,analytics,settings}`, `builder`, `dev`,
   `gym-picker`, `onboarding/[step]`, `paywall`, `settings/{account,gyms,legal/[doc],permission/[name],support}`,
   `setup/[step]`, `sign-in`, `unlock/{gym,treadmill}`). The scheme `excerlock` is registered
   (`app-next/app.json:8`) but there is no `Linking` config or deep-link handler in `app/_layout.tsx`.
   **Absent.**
2. **The ShieldAction "deep-link notification workaround"** (`:26`). This is a *third* notification type
   (a tap-through notification fired from the shield extension), which directly contradicts P2-T09's law that
   exactly two notification ids exist (`P2-T09-notifications.md:3`, `:16` "the catalog has exactly two ids").
   No copy exists for it in `app-next/src/content/`. **Absent and self-contradictory across tasks.**
3. **Where a shield-notification tap lands.** Unspecified beyond "→ Home".
4. **Timezone change / midnight re-registration** (`:36-37`) can silently change when a user's apps lock.
   No copy, no notice. Absent.
5. **"Unmeasured day"** in Analytics has an empty state (`02-screen-inventory.md:154`) but no per-bar
   treatment named for partially measured days.

**Acceptance checklist** (`:45-51`)
- [ ] Simulator: picker returns a handle; `locked` applies; `unlockedMet` clears; schedules registered
      (inspect via the diagnostics log).
- [ ] Extension decision table tested for: interval start with met=today → no shield; met=yesterday → shield;
      walk lease live → no shield; lease expired → shield.
- [ ] Usage counter increments in the simulator with a simulated threshold event (fixture path from the old
      e2e composition root).
- [ ] **Real enforcement, deny path and shield rendering are explicitly NOT claimed here; they belong to
      P2-T11** (`:51`).

---

### P2-T05 — Steps, walking, gym, health adapters

**Delivers four adapters** (`P2-T05-signals-behind-ports.md:5-52`).

**1. `StepsAdapter implements StepsPort`** (`:5-12`) over `modules/excerlock-motion` +
`engine/signals/motion`: authorization via `CMMotionActivityManager` status; `stepsSince(dayStart)` via the
module's historical pedometer query; `subscribe` via live pedometer updates **while the app is foregrounded**;
re-query from local day start on foreground and at midnight (decision B8). Progress →
`ruleDaysStore.applyProgress`.
**Background limitation stated in the task**: HealthKit is not used for steps (B11); step-goal met detection
happens only when the app is foregrounded or when a DeviceActivity interval wakes the extension — and
**"the extension cannot read pedometer"** (`:10-11`).

**2. `WalkingAdapter implements WalkingPort`** (`:13-18`) over `engine/walking/walkingSessionController.ts`,
`engine/signals/gait`, `engine/signals/placement`, `modules/excerlock-gait-vision`: phases map 1:1 to the
Phase 1 script (`verifying → walking → grace → ended`); lease via P2-T04; stop grace from `settingsStore`;
treadmill propped flow (`scanning → propped → handheld → handoff`) surfaces as the framing view with the real
camera preview (`GaitVisionPreviewView`); keep-alive via foreground location as today.

**3. `GymAdapter implements GymPort`** (`:19-46`) over `engine/signals/location` +
`engine/gym/gymPresenceController.ts`: saved places stored locally (**max 5, iOS region cap 20**); manual
`checkIn` (When-in-use); **`enableAutoDetect` is the only path that requests Always** and registers geofences
with `expo-task-manager`, passing each place's saved `radiusMeters` (50–200, chosen on the picker); presence
events → arrival met / dwell minutes progress (30-second confirmation cooldown kept) (`:20-24`).
Search and geocoding, decided 2026-09-07 (`:25-45`): the picker screen built on `react-native-maps` (Apple
provider) per `docs/handoffs/gym-location-picker-build.md` **does not change**; this task replaces the fake
behind the five search methods with one local Expo Module in Swift, `modules/expo-local-search`
(`npx create-expo-module@latest --local`; Android stubs reject with a typed "not supported" error):
- `suggest(query, near?)` → `MKLocalSearchCompleter`, `resultTypes = .pointOfInterest`,
  `pointOfInterestFilter` including `.fitnessCenter`, region centred on `near` or the device region; Apple
  debounces keystrokes, JS still cancels stale promises and keeps one query in flight (`:29-31`).
- `resolve(suggestion)` → `MKLocalSearch(request: .init(completion:))`, first `MKMapItem` (`:32-33`).
- `nearbyGyms(near)` → `MKLocalPointsOfInterestRequest` at 3 km, fitness-centre filter, six nearest (`:34`).
- `reverseGeocode(coord)` → `MKReverseGeocodingRequest` on **iOS 26+**, `CLGeocoder` below; at most one in
  flight, one per settle (**Apple throttles to about one request per user action**); JS cache stays (`:35-37`).
- `currentLocation()` → `expo-location` `getCurrentPositionAsync`, null when not granted (`:38`).
- Saved-gym thumbnails for Settings › Gyms → `MKMapSnapshotter` at the saved coordinate, pin and ring drawn on
  the image, cached on disk per gym id (`:39-40`).
Cost $0, no API key, no server, no quota; **search works offline-degraded** (current location and drop-a-pin
still save) (`:41`). Rejected alternatives and their costs: Apple Maps Server API (key must live on the VPS,
25k calls/day), Google Places New ($2.83/1k autocomplete, `displayName` Pro $17/1k, terms forbid storing
name/address), Mapbox Search ($11.50/1k sessions); no maintained RN wrapper exposes the completer; module is
~150 lines of Swift (`:41-43`).
Contract tests (`:44-46`): the native adapter passes the same port-level suite the fake passed, plus a
fitness query in Chicago returns a result with a coordinate; an empty query returns nothing; a cancelled query
never resolves; reverse geocode of a known coordinate returns a non-empty string.

**4. `HealthAdapter implements HealthPort`** (`:47-49`) over `engine/signals/health`
(`KingstinctHealthKitClient`): `workoutsToday('running' | 'biking')` → summed duration and distance from
**device-recorded workouts started today** (manual entries excluded as before); background delivery bootstrap
kept; **claim-on-open**.

Plus: port-level contract tests for each adapter with the existing recordings
(`treadmillRecordings.json`, gait fixtures, geofence event fixtures) (`:50-51`), and
`permissionsStore` reads live statuses from each adapter on foreground (`:52`).

**Ports/adapters:** `StepsPort`, `WalkingPort`, `GymPort` (+ `PlaceSearch`, which `GymPort` extends —
`app-next/src/ports/GymPort.ts:4`), `HealthPort`. `GaitPort` is not named (see §2).

**Assumes UI already exists**
- Home `ProgressCard` per rule with steps progress, "Check in", "Auto-detect on", "Start a walk"
  (`02-screen-inventory.md:127`; copy `app-next/src/content/home.ts:36-48`).
- Walking session sheet `SH-walk` with `verifying → walking → grace → ended` and the treadmill framing view
  (`02-screen-inventory.md:182`; copy `app-next/src/content/sessions.ts:1-23`).
- Manual gym check-in sheet `SH-checkin` (`02-screen-inventory.md:181`; copy `sessions.ts:24-37`).
- Gym picker full-screen modal on a real Apple map with search, nearby list, centre pin, radius slider,
  offline copy — already built per `docs/handoffs/gym-location-picker-build.md:25-99`;
  route `app-next/app/gym-picker.tsx`; copy `app-next/src/content/gymPicker.ts`.
- Settings › Gyms list (`02-screen-inventory.md:173`, `app-next/app/settings/gyms.tsx`, copy
  `settings.ts:41-46`).
- Always-location upgrade explanation (`02-screen-inventory.md:166`; copy
  `app-next/src/content/permissions.ts:1-4`, `settings.ts:37-38`).
- The two aha unlock screens `unlock/treadmill` and `unlock/gym` (decision B20,
  `plans/rebuild/00-decisions.md:41`; routes `app-next/app/unlock/treadmill.tsx`, `app-next/app/unlock/gym.tsx`;
  copy `app-next/src/content/unlock.ts:1-38`) — **these are not mentioned anywhere in P2-T05 or any other
  Phase 2 task**; nothing says who wires their camera, live map, "Confirming you're here" cooldown or confetti
  to real signals.

**Introduces user-visible behaviour with NO screen or copy yet**
1. **Background-unlock claim-on-open copy.** `:11-12` explicitly prescribes Home copy:
   *"Open ExcerLock after your walk to unlock" appears only if the goal was reached while closed — the app
   checks on launch.* `grep` of `/Users/johansardar/ExcerLock/app-next/src/content/` finds no such string;
   `home.ts:1-54` has no claim-on-open state. **Absent.** The same applies to HealthKit claim-on-open
   (`:49`).
2. **Saved-gym map thumbnails** (`:39-40`) are a new visual element in the Settings › Gyms rows; the Phase 1
   rows have no thumbnail slot named in `02-screen-inventory.md:173` and this is an acceptance item
   (`:65`).
3. **Offline search copy** exists (`gym-location-picker-build.md:58-59` moved it into
   `src/content/gymPicker.ts`) — covered.
4. **Region cap 20 vs 5 saved gyms** (`:20`): no user-visible message for hitting the OS cap; the app cap is 5
   (copy `settings.ts:44`), so the OS cap should never be reached. Covered by construction.
5. **Always-location revocation mid-life** — `permissionsStore` reads live statuses on foreground (`:52`) and
   Home has `locationNeeded` (`home.ts:46`), but there is **no re-prompt flow**: iOS will not re-present a
   denied Always prompt, so the only route is `Linking.openSettings()` (P2-T10:6). The permission-detail
   screen exists (`app-next/app/settings/permission/[name].tsx`) but its current copy explicitly says the
   preview leaves device settings unchanged (`settings.ts:56-57`) — that string must change in Phase 2 and no
   task says so.

**Acceptance checklist** (`:55-65`)
- [ ] Simulator: steps from a simulated pedometer fixture reach the goal and flip Home to `unlockedMet`;
      gym check-in with simulated location inside/outside; HealthKit workouts from the simulator's Health app
      count toward a run rule.
- [ ] Harness app root can start a treadmill session and export a run, exactly as before.
- [ ] Only `enableAutoDetect` requests Always location (grep + test).
- [ ] Gym search on the simulator: three letters of a real gym name return Apple suggestions filtered to
      fitness centres within a second; choosing one lands the pin on the venue with the Apple Maps address;
      panning triggers at most one geocode per settle; airplane mode shows the offline copy while
      current-location and drop-a-pin still save; the saved `radiusMeters` is the radius handed to
      `startGeofencingAsync`; **zero calls to any third-party maps API in the network log**.
- [ ] Settings › Gyms rows show a snapshot thumbnail with the pin and ring.

**Repo-state note:** `app-next/modules/expo-local-search/` already exists with
`ios/ExpoLocalSearchModule.swift`, `ios/PlaceSearchService.swift`, `ios/PickerLocationService.swift`,
`ios/ExpoLocalSearch.podspec`, `expo-module.config.json`, `README.md` — but **no JS/TS entry point**
(no `index.ts`). Phase 2 step 3 is partially pre-built.

---

### P2-T06 — Adapty with the Paywall Builder (`SubscriptionPort` real adapter)

**Delivers** (`P2-T06-adapty.md:12-29`)
1. Verify the current Builder package for React Native (`@adapty/react-native-ui`) and its Expo setup in the
   Adapty docs and Expo MCP; pin versions (`:12-14`).
2. `SubscriptionAdapter implements SubscriptionPort`: port `AdaptySubscriptionModule` logic (activate at
   bootstrap, `onLatestProfileLoad`, entitlement mapping, restore, `identify`, `logout`) and add
   `presentPaywall(placement)` → `getPaywall(placement)` + `createPaywallView` + present; map events (purchase
   completed, restored, closed, error) to `Entitlement` transitions and the Phase 1 slot's states.
   **Hard paywall: the Builder view's close is disabled for `onboarding` (configured in the dashboard) and the
   slot re-presents on dismissal** (`:15-21`).
3. Identity: `identify(supabaseUid)` on every session (anonymous included) so purchases attach to the spine
   from the start; `logout` on account deletion; Adapty `customer_user_id` = Supabase uid (`:22-23`).
4. Fallback paywall: bundle the dashboard fallback JSON as before (`fallbackPaywall.ts`), verify export
   (`:24`).
5. Tests: adapter contract tests with the `AdaptySDKPort` mock (extended for the Builder view); entitlement
   mapping for **trial / active / expired / billing issue / grace period** (`:25-26`).
6. Sandbox: with a sandbox Apple ID, run a trial purchase, verify the Adapty dashboard shows the profile keyed
   by the Supabase uid and the VPS `adapty_subscription_states` row appears via the webhook; record in
   `evidence/P2-T06/` (`:27-29`).

Facts (`:5-10`): `react-native-adapty` 4.x, single access level `premium`, placements `onboarding` and
`in_app`, product ids in `app/src/subscription/README.md` (two subscription groups A and B),
`EXPO_PUBLIC_ADAPTY_KEY` via `app.config.ts` `extra`; server webhook unchanged;
**Adapty's PostHog integration owns all lifecycle events (D9) — the app emits none**;
decision C6: paywall UI is the Paywall Builder, Johan designs it in the dashboard.

**Ports/adapters:** `SubscriptionPort` → `SubscriptionAdapter` (`:15`).

**Assumes UI already exists**
- Paywall slot P (`02-screen-inventory.md:95`) with states loading · products · purchasing · restored · error ·
  dismissed, hard-paywall dismissal returning to P with the "you need a plan" message; Phase 1 stand-in in
  `app-next/app/paywall.tsx`, copy `app-next/src/content/subscription.ts:24-46`.
- Re-entry for `expired` / `billingIssue` with placement `in_app` above the tabs
  (`02-screen-inventory.md:97-98`; copy `subscription.ts:36-37`).
- Trial sequence T1–T4 (`02-screen-inventory.md:91-94`; copy `subscription.ts:3-23`).
- Settings › Subscription plan/renewal/Manage/Restore rows (`02-screen-inventory.md:164`; copy
  `settings.ts:14-31`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **The Builder view itself replaces the Phase 1 stand-in.** Its design lives in the Adapty dashboard, so
   Phase 1's approved paywall visuals do not carry over; there is no in-repo spec for what the Builder paywall
   must look like. Open item E4 records that "real prices, trial length and offer come from the Adapty
   dashboard" (`plans/rebuild/00-decisions.md:74`).
2. **Subscription lapse mid-session.** `:26` requires entitlement mapping for **grace period** — there is no
   grace-period copy anywhere: `subscription.ts:36-46` has `expired`, `billingIssue`, `notFound`, `restored`,
   `cancelled` and `settings.ts:14-22` has `active/trial/none/expired/billingIssue/unknown`. **No grace-period
   string. Absent.**
3. **Re-presentation loop on dismissal** (`:20-21`): a user who dismisses the Builder view lands back on P.
   Copy for "you need a plan" is `subscription.ts:41` (`cancelled: 'Choose a plan to continue.'`) — covered,
   but nothing says how many times before it becomes hostile.
4. **`identify()` on an anonymous uid** creates an Adapty profile per anonymous install — no user-visible
   surface, but see P2-T07's unresolved person-count question (below).
5. **Trial length placeholder.** `app-next/src/content/subscription.ts:2` hardcodes
   `{ trialDays: 7, reminderDaysBefore: 2, label: '7-day free trial' }` and its own comment says
   "Phase 2 must read Adapty's real offer and prices". T2/T4 copy hardcodes "2 days before" and
   "Day 5 · Reminder" / "Day 7 · Billing begins" (`subscription.ts:12`, `:20-22`) — those strings break if the
   dashboard trial is not 7 days. No task assigns the fix.

**Acceptance checklist** (`:33-35`)
- [ ] Onboarding P shows the Builder paywall; purchase → `trial` → X1. Restore path works.
- [ ] Sandbox purchase round-trips to the VPS (webhook row present).
- [ ] No lifecycle analytics emitted by the app (single-emitter guardrail green).

---

### P2-T07 — PostHog and Sentry (`AnalyticsPort` real adapter, crash reporting)

**Delivers** (`P2-T07-posthog-sentry.md:5-24`)
1. Reuse `packages/analytics-events` in `app-next` as a workspace dependency (`:5`). Updates:
   - `flow.ts` `FLOW_SCREENS` → the new onboarding ids (O01…O20, branch ids, S1–S4, T1–T4, P, X1–X5) in path
     order; `onboarding_screen_viewed` / `onboarding_answer` unchanged in shape (`:6-7`).
   - Remove vendor events; remove `earn_claimed`, `sick_day_override_used`, `milestone_unlocked`,
     `share_card_shared`, `notification_toggled` (no toggles); **keep `notification_opened`** (trial reminder)
     (`:8-9`).
   - Add `rule_met` (owner client; props activity, mode kind, day-of-week, minutes-into-window bucket —
     **no values**), `apps_unlocked_rest_of_day`, `walking_session_started/ended` (rename of `walk_session_*`),
     `setup_permission_result` (permission, result), `sign_in_completed` (provider) (`:10-12`).
   - README D6: `distinct_id` = Supabase uid; D8: flags bucket on `$device_id` unchanged (`:13`).
2. Port `src/analytics/**` (kit, sinks, privacy policy, runtime, flow tracker) and `src/experiments/**`
   (registry; keep `exp-shield-copy-v1` if the shield copy override survives, else drop).
   **Unresolved inside the task:** `identify(uid)` on session start (anonymous too) vs PostHog
   `personProfiles: 'identified_only'` — *"confirm the anonymous-uid policy does not explode person counts:
   identify only on non-anonymous sessions and alias the anonymous distinct id at link time. Decide with the
   PostHog docs and write it in the README"* (`:14-18`). The task states both the problem and two
   contradictory instructions in one sentence.
3. Sentry: port `src/observability/sentry.ts` scrub and init order; plugin org `edge-ix`, project
   `excerlock-mobile`; server unchanged (`:19-20`).
4. Guardrails `single-emitter.test.ts` and `client-observability.test.ts` re-pointed (`:21`).
5. Tests: registry invariants; privacy policy drops undeclared keys; screen names limited to the `FlowScreen`
   union; identify/reset ordering on sign-in / sign-out / delete (`:22-23`).

**Ports/adapters:** `AnalyticsPort` → PostHog kit (`04-architecture.md:72`).

**Assumes UI already exists:** every onboarding, setup and tab screen id it enumerates
(`02-screen-inventory.md:25-108`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **`notification_opened` implies a notification tap has a landing screen** (`:9`) — see P2-T09 gap 1.
2. **No analytics consent or opt-out surface.** No task adds one; `02-screen-inventory.md:159-173` lists no
   privacy/analytics toggle row in Settings, and `app-next/src/content/settings.ts` has no such string.
   The Phase 1 privacy copy (`app-next/src/content/legal.ts:2-18`) does not mention analytics at all.
   Absent — flagged as a possible App Store review issue, not just a UI gap.

**Acceptance checklist** (`:27-29`)
- [ ] Events from a simulator session appear in the PostHog project with `app: excerlock` and the expected
      distinct id (check with the PostHog MCP).
- [ ] A forced test crash appears in Sentry `excerlock-mobile` with scrubbed payload.

---

### P2-T08 — Sync rules, results, usage and profile to the VPS (`SyncPort` real adapter)

Decision D5. **Sync is a backup and restore channel, not a source of truth for enforcement**
(`P2-T08-sync.md:3`).

**Rules** (`:7-16`)
- The device is authoritative for **today** (rule days, usage). The server is authoritative for nothing; it
  stores the latest by `updated_at` per row (`:7-8`).
- **Push**: debounced 5 s after any change to rules/profile; rule_days and usage_days pushed on app background
  and at most every 15 minutes while foregrounded; batches ≤ 400 rows (`:9-11`).
- **Pull**: on sign-in (identity link) and on fresh install with an existing identity; merge by `updated_at`,
  never overwrite a newer local row; **the app selection (Screen Time handle) is never synced and the restored
  state shows `noAppsSelected` until the user picks apps again** (`:12-13`).
- **Offline**: queued, retried with backoff; never blocks UI; **failures visible only in the dev menu log**
  (`:14`).
- **Privacy**: payloads contain only the P2-T02 §3 schema; a type-level test forbids gym names/coordinates
  (`:15-16`).

**Delivers** (`:18-24`)
1. `SyncAdapter implements SyncPort` over the `/v1/sync/*` endpoints with the Supabase access token.
2. Outbox in AsyncStorage (`excerlock-next.sync.outbox.v1`) with idempotent batches.
3. Merge logic in `src/domain/syncMerge.ts` (pure, tested).
4. **Restore flow UI: on sign-in with server data and empty local rules, an "X5-style 'Welcome back' summary
   of restored rules"; Home shows the no-apps state until the picker is used** (`:22-23`).

**Ports/adapters:** `SyncPort` → `SyncAdapter` (`:19`). Note the port must grow (see §2).

**Assumes UI already exists**
- Home `noAppsSelected` state (`02-screen-inventory.md:132`; copy
  `app-next/src/content/home.ts:12-13`).
- X4/X5 setup screens as the visual template for the restore summary (`02-screen-inventory.md:107-108`).
- The dev-menu event log as the only failure surface (`02-screen-inventory.md:114-115`,
  `app-next/app/dev.tsx`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **The "Welcome back" restore summary screen** (`:22-23`). There is no such screen id in
   `plans/rebuild/02-screen-inventory.md` (checked the whole file — setup ends at X5, `:108`), no route in
   `app-next/app/` and no copy: `grep -rin "welcome back" /Users/johansardar/ExcerLock/app-next/src/content/`
   returns nothing. **Absent.** This is the single largest new-screen obligation Phase 2 creates.
2. **Sync conflicts.** The merge rule is "never overwrite a newer local row" (`:12-13`) — silent, no UI. A user
   who edits a rule on two phones loses one edit with no notice. The plan deliberately keeps failures in the
   dev menu (`:14`), so this is a **decision** rather than an oversight, but it means there is no user-facing
   sync state anywhere: no "last synced", no "sync off", no error toast. Absent by design; worth confirming
   with Johan.
3. **Sign-in gating for restore.** Restore requires sign-in (`:12`), but sign-in is optional everywhere
   (decision B18, `plans/rebuild/00-decisions.md:39`; "Skip for now" at `02-screen-inventory.md:107`).
   Nothing in the app tells a user that skipping sign-in means losing their rules on a new phone. No copy in
   `app-next/src/content/setup.ts` or `settings.ts` says so. Absent.
4. **Partial restore.** `GET /sync` returns only the last 400 rule_days and 400 usage_days
   (`P2-T02-server.md:41-42`); no copy explains truncated history in Analytics.
5. **Privacy copy contradiction.** `app-next/src/content/legal.ts:16` currently tells the user
   "Your conditions and progress remain on this device when you sign out or delete your account." Once rules
   and rule_days sync, that sentence is misleading. P2-T10:16-18 replaces legal text but no task links the two.

**Acceptance checklist** (`:27-30`)
- [ ] Two simulators (sequentially, same dev account): create rules on A, sign in on B → rules and streak
      restored on B; edit on B, relaunch A → A shows B's edit.
- [ ] Airplane mode: changes queue and flush on reconnect.
- [ ] Type-level privacy test green.

---

### P2-T09 — The two local notifications

Decision B14: **only** the trial-ending reminder and the walk-lease warning; no push; `withNoPush` stays first
in the plugin list and the guardrail keeps `aps-environment` out (`P2-T09-notifications.md:3-4`).

**Delivers** (`:8-17`)
1. `NotificationsAdapter implements NotificationsPort` over `expo-notifications` local scheduling, porting the
   reduced parts of `app/src/notifications/` (permission boundary, deterministic ids, delivery evidence
   store) (`:8-9`).
2. **Trial reminder**: scheduled when the entitlement becomes `trial` with a known `renewsAt`, at
   `renewsAt − 2 days` at **18:00 local** (or `renewsAt − 24 h` if the trial is shorter than 3 days);
   cancelled on conversion/cancel; **tapping opens Settings › Subscription**; copy ≤ 35/90 chars,
   payoff-first, no guilt (`:10-12`).
3. **Walk-lease warning**: 30 s before lease expiry during a walking session (state rule), as today; no toggle
   (`:13`).
4. **Permission requested only from T3 ("Enable reminders") and Settings › Permissions; never elsewhere**
   (`:14`).
5. Tests: scheduling math, cancellation, permission gating, and a "no other notification type exists" test —
   **the catalog has exactly two ids** (`:15-16`).

**Ports/adapters:** `NotificationsPort` → `NotificationsAdapter` (`:8`).

**Assumes UI already exists**
- T3 "Want a trial reminder?" with "Enable reminders" / "Maybe later"
  (`02-screen-inventory.md:93`; copy `app-next/src/content/subscription.ts:14-17`).
- Settings › Permissions › Notifications row (`02-screen-inventory.md:165`; copy
  `app-next/src/content/settings.ts:64`, `:72`, `:80`).
- The walking session sheet, where the lease countdown lives (`02-screen-inventory.md:182`).

**Introduces user-visible behaviour with NO screen or copy yet**
1. **Trial-reminder tap target: "Settings › Subscription"** (`:12`). There is **no route** for it. Actual
   settings routes are `app-next/app/settings/{account,gyms,legal/[doc],permission/[name],support}.tsx` plus
   `app-next/app/settings/_layout.tsx`; Subscription is a *section within* the settings tab screen
   (`app-next/src/features/settings/SettingsPage.tsx`, section label `settingsCopy.subscription` at
   `app-next/src/content/settings.ts:6`). No deep-link handler, no scroll-to-section anchor exists.
   **Absent.**
2. **The notification copy itself** (`:12`, ≤ 35 chars title / 90 chars body). No such strings exist —
   `grep` of `app-next/src/content/` finds no notification title/body pair. **Absent.**
3. **Walk-lease warning copy and tap target.** `:13` says "as today" without naming copy or where the tap
   lands. `app-next/src/content/sessions.ts:1-47` has no lease-warning string. **Absent.**
4. **The third notification P2-T04 needs.** `P2-T04-lock-policy-on-screen-time.md:26` requires the ShieldAction
   deep-link notification workaround; that is a notification type this task's "exactly two ids" test
   (`:16`) will fail. **Cross-task contradiction.**
5. **Denied-notifications recovery.** T3 continues on denial (`02-screen-inventory.md:93`, states
   "notDetermined · granted · denied (both continue)") and Settings › Permissions can re-prompt (`:14`), but
   iOS will not re-present a denied notification prompt — only `Linking.openSettings()`. The permission detail
   screen exists but its Phase 1 copy says the preview leaves device settings unchanged
   (`settings.ts:56-57`). No task rewrites that string.

**Acceptance checklist** (`:20-21`)
- [ ] Simulator: trial → reminder scheduled (inspect pending notifications via the dev menu); lease warning
      fires during a simulated session.
- [ ] Clean prebuild has no `aps-environment` (guardrail).

---

### P2-T10 — Real Settings, permissions health, subscription management, account deletion

**Delivers** (`P2-T10-settings-account-wiring.md:5-18`)
1. **Permissions health** rows read live statuses from the adapters (P2-T04/T05/T09) on foreground;
   **Fix → request when `notDetermined`, `Linking.openSettings()` when denied** (`:5-6`).
2. **Subscription**: plan and renewal from the Adapty profile; Manage subscription →
   `https://apps.apple.com/account/subscriptions`; Restore → adapter (`:7-8`).
3. **Rate ExcerLock**: `expo-store-review` policy ported with thresholds **re-based**: 5th met day with install
   age ≥ 3 days → first 7-day streak → 30-day streak; stop after 3 shows or manual rate; store URL configured
   (App Store id from the `asc` CLI) (`:9-11`).
4. **Share ExcerLock**: native share sheet with the App Store URL (`:12`).
5. **Support**: real `POST /v1/support` with retry semantics ported from `app/src/support` (`:13`).
6. **Account**: sign in/out via P2-T01; Delete account → server `DELETE /v1/user` → ordered erasure;
   **local rules kept (local-first); new anonymous session** (`:14-15`).
7. **Legal**: real Terms and Privacy text supplied by Johan; the placeholder stays flagged in the content file
   until then; **the app must not ship with placeholders — add a release guardrail test that fails if the
   placeholder marker is present in a production build** (`:16-18`).

**Ports/adapters:** consumes `SubscriptionPort`, `AuthPort`, `SupportPort`, and every permission-status
adapter; implements none of its own.

**Assumes UI already exists** — the whole Settings surface at `02-screen-inventory.md:159-173`:
profile header, subscription rows, permission rows × 6, preferences (units, stop grace, gym auto-detect,
haptics), locked apps shortcut, support/rate/share, legal, account, footer with the 7-tap dev menu; and the
sub-screens `settings/support`, `settings/legal/[doc]`, `settings/permission/[name]`, `settings/account`,
`settings/gyms` (`:173`) — all present in `app-next/app/settings/`.

**Introduces user-visible behaviour with NO screen or copy yet**
1. **Every "preview" string must be replaced.** These Phase 1 strings describe fake behaviour and will be
   wrong in Phase 2, and no task lists them:
   - `settingsCopy.external` — "This preview keeps you in ExcerLock. Subscription management will open your
     App Store account in the connected app." (`app-next/src/content/settings.ts:30-31`).
   - `settingsCopy.settingsNote` — "This preview leaves device settings unchanged. The connected app will open
     iOS Settings here." (`settings.ts:57`).
   - `settingsCopy.copied` — "Invitation copied in this preview." (`settings.ts:53`).
   - `subscriptionCopy.devNote` — "Paywall stand-in…" (`app-next/src/content/subscription.ts:44`).
2. **Store-review prompt moments** (`:9-11`) — three new interruption points (5th met day, 7-day streak,
   30-day streak). S4 is described as "a warm-up only (real `StoreReview` call happens in Phase 2 policy, not
   here)" (`02-screen-inventory.md:90`), so the *screen* exists but the in-app trigger points have no design:
   nothing says what the user sees around the native prompt. Absent.
3. **Rating stop rule** ("stop after 3 shows or manual rate", `:10`) has no visible surface.
4. **The legal placeholder guardrail** (`:16-18`) needs a machine-readable marker; today the only marker is a
   code comment: `app-next/src/content/legal.ts:1` — `// Phase 1 placeholder legal text. Replace with
   counsel-approved documents before release.` Workable, but nothing declares it the marker.
5. **Delete-account outcome copy exists** (`settings.ts:96-107`), including the five facts and
   `deleted: 'Your account has been deleted. Your on-device plan is still here.'` — covered.

**Acceptance checklist** (`:22-23`)
- [ ] Every Settings row does the real thing on the simulator; deletion verified against the dev Supabase
      project and the VPS (row tombstoned, Adapty logout called, PostHog reset).
- [ ] Release guardrail for legal placeholders green only when real text is present.

---

### P2-T11 — Physical-device verification

*"A passing simulator test proves nothing about enforcement"* (`P2-T11-device-verification.md:3`).
Run on Johan's iPhone via `npx expo run:ios --device <device-udid>`, evidence (screen recordings from the
phone, diagnostics log exports) in `evidence/P2-T11/` (`:3-5`).

**The checklist** (`:7-27`) — this doubles as the Phase 2 acceptance list:
1. Fresh install → onboarding (walking, step goal) → sandbox trial purchase via the Builder paywall → setup:
   real Screen Time prompt (grant), real `FamilyActivityPicker` (pick two real apps), Motion prompt (`:7-8`).
2. Home shows `beforeWindow` or `locked` correctly for the real clock; set a window starting in 2 minutes; at
   window start the picked apps show the **ExcerLock shield** with the right copy and buttons;
   **"Open ExcerLock" deep-links home** (`:9-11`).
3. Walk until the step goal is met with the app open → Home flips to `unlockedMet`, shields lift; kill the app;
   shields stay lifted; next day's window re-shields (`:12-14`).
4. **Deny paths**: reinstall, deny Screen Time → Home `permissionNeeded`, Fix opens Settings; deny Motion →
   step rule shows the needed-permission state (`:15-16`).
5. **State mode**: while-walking rule; start session; walk → shields lift; stop → grace → lease expiry
   re-shields; walk-lease warning arrives 30 s before. Treadmill: prop the phone, framing view finds the head,
   session verifies (harness run exported) (`:17-19`).
6. **Gym**: save a real gym via search; manual check-in inside the radius → met; enable auto-detect (Always
   prompt) → **arrive at the gym with the app closed → met recorded when the app next opens or the geofence
   wakes the task** (`:20-22`).
7. **Running**: record a run with the Watch or a Health-writing app → run rule progresses/meets from Health
   (`:23`).
8. Trial reminder scheduled (pending list); Sentry test crash; PostHog events for the session (`:24`).
9. Restore on a second device or after reinstall via sign-in (P2-T08) (`:25`).
10. **Usage monitor**: use a locked app for 10 minutes after unlocking → Analytics shows ~10 minutes the next
    day (5-minute resolution) (`:26-27`).

Every item gets pass/fail, date, iOS version, device and a note. **Failures become GitHub issues on
`JohanSardar/excerlock-app` the same session** (repo rule), and cross-app pitfalls go to the ledger via
`log-pitfall` (`:29-31`).

**Introduces user-visible behaviour with NO screen or copy yet**
- Item 2 asserts **"Open ExcerLock" deep-links home** — the target route/handler does not exist (see P2-T04
  gap 1).
- Item 6's "met recorded when the app next opens" is the **background-unlock claim-on-open** behaviour with no
  Home copy (see P2-T05 gap 1).
- Item 9's restore is the "Welcome back" screen that does not exist (see P2-T08 gap 1).

---

### P2-T12 — Cutover: archive the old app, promote the new one, TestFlight

Only after P2-T11 passes **and Johan says so** (`P2-T12-cutover.md:3`).

**Delivers** (`:5-21`)
1. Tag `old-app-final` on `main`, branch `archive/old-app` so `app/`, `excer-ui-mock/`, `prototype/` and the
   retired packages remain recoverable; note the tag in `ARCHITECTURE.md` (`:5-6`).
2. Remove `app/`, `excer-ui-mock/`, `packages/ledger`, `packages/condition-model`; `git mv app-next app`;
   update root workspaces, CI (`.github/workflows/ci.yml`), guardrails paths, `e2e/` (keep only the node
   contract tests that still apply; **Maestro flows deleted**), `scripts/check-env.ts` (`:7-9`).
3. Keep `prototype/scripts/` (asset pipeline) or move it to `design/scripts/` and update `design/STYLE.md`
   references (**STYLE.md is law; edit it only for the path**) (`:10-11`).
4. Server: delete `docs/research/vendors/` and `docs/vendor-signup-checklist.md` or mark them historical
   (`:12-13`).
5. Regenerate `TOOLING.md` with `/setup-agent-tooling` (adds Supabase, removes Clerk and Maestro), update
   `AGENTS.md` (Maestro banned; new folder names), `ARCHITECTURE.md`, and put a top banner on
   `excerlock-app-prd.md` pointing at `plans/rebuild/00-decisions.md` for everything it now contradicts
   (`:14-17`).
6. Rotate secrets that were Clerk-only out of `~/.excerlock/env`, `/etc/excerlock/env`, EAS secrets (`:18`).
7. EAS: carry over `eas.json` profiles (development, preview, production); build a `preview` and push to
   TestFlight with `eas submit` (single owner per TOOLING.md); What-to-test notes via the `asc` skill
   (`:19-20`).
8. Doctor: `python3 ~/.claude/agent-tooling/doctor.py --repo .` green (`:21`).

**Acceptance checklist** (`:24-27`)
- [ ] `main` builds, tests and guardrails green with `app/` = the new app.
- [ ] TestFlight build installed on Johan's phone from the store path, not the dev client.
- [ ] Archive tag verified restorable (`git worktree add /tmp/old old-app-final` builds the old app).

---

## 4. Consolidated list of user-visible behaviours Phase 2 introduces with no screen or copy

| # | Behaviour | Introduced by | Status |
| --- | --- | --- | --- |
| 1 | Shield buttons "Open ExcerLock" → `excerlock://` and `excerlock://locked-apps` → Home | `P2-T04:26-27`, `P2-T11:11` | No route, no deep-link handler in `app-next/app/`; scheme registered at `app-next/app.json:8` only |
| 2 | ShieldAction tap-through **notification** workaround | `P2-T04:26` | No copy; contradicts the two-notification law at `P2-T09:3`, `:16` |
| 3 | Trial-reminder notification title/body (≤35/90 chars) | `P2-T09:12` | Absent from `app-next/src/content/` |
| 4 | Trial-reminder tap → "Settings › Subscription" | `P2-T09:12` | No such route; subscription is an unanchored section of the settings tab |
| 5 | Walk-lease warning copy and its tap target | `P2-T09:13` | Absent from `app-next/src/content/sessions.ts` |
| 6 | Background/closed-app claim-on-open — "Open ExcerLock after your walk to unlock" | `P2-T05:11-12` | Prescribed by the task, absent from `app-next/src/content/home.ts` |
| 7 | HealthKit claim-on-open for runs/rides | `P2-T05:49` | Same gap |
| 8 | "Welcome back" restored-rules summary after sign-in | `P2-T08:22-23` | No screen id in `02-screen-inventory.md`, no route, no copy |
| 9 | Sync conflict / stale-edit outcome | `P2-T08:12-14` | Deliberately invisible (dev-menu log only) — confirm with Johan |
| 10 | Sign-in gating consequence ("skip sign-in = no restore on a new phone") | `P2-T08:12`, B18 | No copy on X4 or in Settings |
| 11 | Truncated restore (last 400 rule_days / usage_days) | `P2-T02:41-42` | No copy |
| 12 | `410 ACCOUNT_DELETED` → silent sign-out + fresh anonymous session | `P2-T01:23-24` | No copy |
| 13 | Provisioning/offline failure at boot gate L1 | `P2-T01:22-23` | No copy |
| 14 | Subscription **grace period** state | `P2-T06:26` | No string in `subscription.ts` or `settings.ts` |
| 15 | Adapty Builder paywall visuals | `P2-T06:9-10`, C6 | Lives in the dashboard; no in-repo spec; trial length hardcoded at `subscription.ts:2`, `:12`, `:20-22` |
| 16 | Permission re-prompt when a permission is already denied (iOS never re-prompts) | `P2-T10:5-6`, `P2-T05:52` | Detail screen exists but its copy still says the preview leaves settings unchanged (`settings.ts:56-57`) |
| 17 | Store-review prompt trigger moments | `P2-T10:9-11` | No design for the surrounding UI |
| 18 | Real Terms/Privacy text; the current privacy copy contradicts sync | `P2-T10:16-18` vs `legal.ts:16` | Placeholder marker is only a code comment (`legal.ts:1`) |
| 19 | Analytics consent / opt-out | implied by `P2-T07` | No row in `02-screen-inventory.md:159-173`, no copy |
| 20 | Saved-gym map thumbnails in Settings › Gyms | `P2-T05:39-40`, acceptance `:65` | New visual element not in `02-screen-inventory.md:173` |
| 21 | Native `AppleAuthenticationButton` replacing the Phase 1 X4 row | `P2-T01:29` | Visual change vs README.md:18-20 |
| 22 | Dev menu gating in production builds | `02-screen-inventory.md:171` | No task implements it |
| 23 | Wiring the two aha unlock screens (`unlock/treadmill`, `unlock/gym`) to real camera/geofence signals | decision B20 (`00-decisions.md:41`) | Screens and copy exist (`app-next/src/content/unlock.ts`) but **no Phase 2 task names them** |

---

## 5. Platform gaps the research docs record

### 5.1 `docs/research/device-activity-gaps.md` (react-native-device-activity 0.6.1, dated 2026-07-28)

**Library facts**
- Package `react-native-device-activity`, version **0.6.1** (npm latest 2026-02-19); v0.5.0 added
  `startMonitoring`/`stopMonitoring` as background *actions* (`:7-8`).
- **Bus factor = 1** (Robert Herber / Kingstinct), 173 stars; plan for fork-and-patch (`:9`).
- Config plugin `{ appleTeamId, appGroup }` generates **three native targets**; deployment floor iOS ≥ 15.1;
  **no Expo Go ever**; **FamilyControls distribution entitlement must be requested once per bundle ID = 4
  requests** (app + 3 extensions); until granted, not even an EAS dev-client build — local Xcode builds only
  (`:10`).
- Everything crosses process boundaries via **app-group UserDefaults**; extensions only execute pre-declared
  action lists, run no JS and no app code (`:11`).

**Hard OS limits (`:23-29`)**
1. **20 concurrent monitors** max (Apple limit) (`:25`).
2. **15-minute minimum monitoring interval** — `DeviceActivityCenter` rejects shorter intervals; the
   community workaround is to **backdate `intervalStart`** so the future portion is short; unofficial
   (issue #79) (`:26`).
3. **Thresholds measure cumulative *usage* of the selection within the interval, not wall-clock time**;
   `includesPastActivity` is **iOS 17.4+** and below that the library silently passes `false` (`:27`).
4. Extension execution is **static** — payloads declared ahead of time; the only dynamic values are
   placeholder strings; **no arithmetic OS-side** (`:28`).
5. Monitor extensions have a **~6 MB jetsam budget**; interval callbacks fire with **minutes of jitter** and
   thresholds lag usage. **Nothing is real-time-guaranteed** (`:29`).

**Ranked gaps (`:58-67`)**
- **G1 — Shield → app deep-link is broken** (🔴, highest product impact). `openApp` is a confirmed no-op
  (issue #81, maintainer-confirmed); the `openUrl`/`openUrlWithDispatch` hack uses a freshly created
  `NSExtensionContext` not connected to the host and does not reliably work. Reliable options: shield button
  fires `sendNotification` with a deep link the user taps (**two taps instead of one**) — or the button just
  closes and the user opens ExcerLock manually (`:46`, `:60`).
- **G2 — sub-15-minute unlock increments rely on the backdated-interval hack** (`:50`, `:61`); if it fails,
  increments degrade to 15 minutes; **re-shield is ~0–2 min late** from interval-end jitter.
- **G3 — mid-day re-arm usage continuity**: `includesPastActivity` is iOS 17.4+; below that every re-arm
  forgets the day's usage and over-grants (`:41`, `:62`).
- **G4 — drain metering is a threshold-ladder approximation**: undocumented event-count ceiling per monitor,
  tick lag, re-arm cost (`:43`, `:63`).
- **G5 — shield content is static-template only**: Apple's fixed fields (blur/bg colour, one icon — SF Symbol
  or an app-group image file, title, subtitle, primary + secondary button labels/colours). No custom layout,
  no live countdown, no banner art. Text supports only Apple's placeholders
  (`{applicationOrDomainDisplayName}`, `{familyActivitySelectionId}`, `{token}`, `{tokenType}`) — nothing
  app-defined. Copy must be designed for **staleness**, not live numbers. Selection→shield matching is a
  documented best-guess heuristic (`:20`, `:45`, `:64`).
- **G6 — exempt apps are not programmatically enforceable**: tokens are opaque both ways; we cannot identify
  or subtract "Messages" from a user's selection; a category selection will happily shield Messages;
  onboarding coaching is the only mitigation (`:49`, `:65`).
- **G7 — picker fragility**: the SwiftUI `FamilyActivityPicker` **crashes under load** (README recommends a
  fallback view — build one); iOS silently **auto-promotes N individually-picked apps into a category token**
  (issue #95), so **never build UI or logic on `applicationCount`** (`:48`, `:66`).
- **G8 — single-maintainer dependency**; fork/patch-package readiness; pin versions (`:67`).
- **Custom-Swift verdict:** only G1 clearly needs custom Swift (patched/forked ShieldAction target) (`:69`).
- Other recorded constraints: **`DeviceActivityReport` extension cannot share data back to the app**
  (sandboxed, issue #64) — display-only, never a ledger source (`:43`); **no threshold-update API**
  (issue #74) — you must `stopMonitoring` → `startMonitoring` (`:41`); a **schedule change while the app is
  dead** needs a pre-armed monitor or waits for the next app open (`:44`).

**How Phase 2 lands against these:** P2-T04 uses window-instance schedules over 7 days (`P2-T04:11-13`), a
renewable 15-minute walking lease (`:16-18`, i.e. it accepts the G2 15-minute floor rather than the backdating
hack), 5-minute cumulative usage thresholds with `includesPastActivity: true` (`:20-23`, i.e. it requires
iOS 17.4+, which the deployment target already is — `app-next/app.json:38-39`), and it keeps the
ShieldAction **deep-link notification workaround** (`:26`) — i.e. it adopts G1's fallback.
No Phase 2 task addresses **G6** (exempt-app coaching copy) or **G7** (picker crash fallback UI) — neither
appears in `plans/rebuild/phase-2-backend/` (grepped the folder).

### 5.2 `docs/research/familycontrols-on-simulator.md` (measured 2026-08-01, superseded 2026-08-04)

- **Current position**: on a **fresh** iOS 26.4.1 simulator device, real FamilyControls `.individual`
  authorization **completes silently — no sheet is ever presented** (`:7-33`). Re-measured twice, including
  after `simctl privacy reset all` + uninstall/reinstall, where the app launched **already approved**; there is
  **no known simulator route to un-grant it** short of deleting the device (`:14-20`).
- **What that does not change** (`:38-40`): the **deny path cannot be produced** (no sheet → nothing to
  refuse), and **whether a shield actually blocks an app is still device-only truth**, as are background wakes
  and real motion.
- Frameworks ship in both the simulator SDK and runtime: `FamilyControls`, `ManagedSettings`,
  `DeviceActivity` + the private `FamilyControlsObjC`, `FamilyControlsSlotSupport`, `ScreenTimeCore`
  (`:58-61`).
- On the old long-lived device, `getAuthorizationStatus()` → `0` and `isShieldActive()` → `false` worked while
  `requestAuthorization()` **threw "Family Controls authorization canceled"** (`:63-70`); the cause was the
  authorization UI service dying before answering (`:93-99`), because
  `PasscodeAndBiometricsSettings.framework` ships **only `.lproj` directories** in the runtime (`:101-106`).
- **A device passcode cannot be set on a simulator by any route** (no keybag, sealed read-only APFS snapshot,
  `simctl` has no passcode capability, `mdmd` only *clears*) (`:107-115`).
- **`simctl privacy` cannot grant Screen Time**: its complete service list is calendar, contacts,
  contacts-limited, location, location-always, photos, photos-add, media-library, microphone, **motion**,
  reminders, siri — **no screen-time, family-controls or device-activity service** (`:117-120`).
- Untested lead: writing a synthetic `Authorizations.plist` under
  `<device>/data/Library/com.apple.FamilyControlsAgent/`; **ManagedSettings persistence already works on the
  simulator** (`EffectiveSettings.plist` holds live keys), so if the gate could be forced, shield writes might
  round-trip. Unverified in both directions — **do not cite it as possible or impossible** (`:127-137`).
- Standing lesson recorded in the file: *"a measurement is a fact about one device on one day, not a law —
  record the device, the runtime, and the date with every claim"* (`:41-45`, repeated `:147-149`).

**How Phase 2 lands:** `P2-T03:47-48` acceptance expects "FamilyControls authorization completes (silently on
simulator, as measured 2026-08-04)"; `P2-T04:51` explicitly refuses to claim real enforcement, deny path or
shield rendering on the simulator and hands them to P2-T11; `P2-T11:15-16` is the deny-path item and can only
run on hardware.

### 5.3 `docs/research/healthkit-coverage.md` (@kingstinct/react-native-healthkit 14.0.2, dated 2026-07-28)

**Facts** (`:7-18`): same maintainer as device-activity (one bus factor covers both OS-boundary libraries);
v14.0.0 (2026-04-08) added the native cold-launch background-delivery engine; the config plugin sets the
`com.apple.developer.healthkit` + `healthkit.background-delivery` entitlements and both usage strings and
injects `BackgroundDeliveryManager.shared.setupBackgroundObservers()` into
`AppDelegate.didFinishLaunchingWithOptions` — **but the published plugin is broken (G1)**;
**HealthKit works on the simulator, unlike FamilyControls** (`:9`).

**Ranked gaps (`:71-81`)**
- **G1 — the published config plugin never wires cold-launch background delivery.** `app.plugin.js` in npm
  14.0.2 predates the AppDelegate injection entirely (zero references to `BackgroundDeliveryManager`), and the
  TS source's regex missed Expo SDK 53+ multi-line Swift signatures. Fixed on master (PR #367, merged 2026-07)
  but **unreleased**. **Silent failure mode** — assert after prebuild that the AppDelegate contains
  `setupBackgroundObservers()`; patch-package or vendor a one-line plugin; build a CI check (`:73`).
- **G2 — active minutes are Watch-only and read-only**: iPhone-only users read ~0 `appleExerciseTime` all day;
  it cannot be seeded on the simulator; prefer workout-minutes copy (`:33`, `:74`).
- **G3 — statistics vs anchored-ledger split must be designed, not improvised**: rates need today's deduped
  total (`HKStatisticsQuery`, which dedups iPhone+Watch overlap); events on workouts need exactly-once per
  workout (anchored query). Mixing them naïvely double-counts or misses (`:75`).
- **G4 — open bug #330, stale foreground reads**: fresh samples invisible until the app is backgrounded ~5 s
  or killed; unresolved (`:76`).
- **G5 — v14 pin decision**: open issues are the cold-start **blank HealthKit sheet flash** (#352, appears
  ~2–3 s after launch for users who *denied* some types), a closed-but-unreleased Swift crash in the workout
  query path on iOS 26 (#366), and a `getWorkoutRoutes` memory leak (#370, unused). Recommendation: start on
  **14.0.2 + patch-package G1**, keep 13.4.0 as the escape hatch (`:55`, `:77`).
- **G6 — read-permission opacity**: `authorizationStatusFor` reflects **write** permission only; a read-denied
  type just returns empty results, so **"no data" and "denied" are indistinguishable** and the app can never
  say "you denied steps" (`:54`, `:78`).
- **G7 — single-maintainer dependency** (`:79`).
- **Querying a type that was never requested crashes** — every query must be gated behind
  auth-requested state (`:53`).

**Background reality (`:41-49`)**
- Cold-launch registration is real in v14 (nil predicate, events queued until JS boots) — a normally
  terminated app **is relaunched headless on new Health data** (`:45`).
- **Force-quit is still fatal**: a user swipe-kill stops HealthKit background launches until the next manual
  open. No library can fix this; **claim-on-open stays load-bearing** (`:46`).
- **Latency is dominated by Watch→iPhone sync**, not the observer; `UpdateFrequency.immediate` is a ceiling,
  not a promise; **do not expect sub-minute unlocks** (`:47`).
- The JS callback carries **no samples** — only `{typeIdentifier, errorMessage}`; the pattern is always
  observer-fires → anchored query (`:48`).
- **Until G1 is patched, background delivery silently degrades to foreground-only** (`:49`).

**Simulator split (`:57-69`)**: the whole read pipeline is real-on-simulator (a dev harness can write genuine
HK data, including `HKWasUserEntered: true`). Must be mocked above HealthKit: **source-attribution variety**
(the sim can never produce a sample that looks like it came from Strava/Garmin/manual),
**`appleExerciseTime`** (read-only, unwriteable everywhere), **background-delivery wakes** (headless relaunch
is not reliably reproducible on sim), and **Watch-sync latency** (`:64-67`).

**How Phase 2 lands:** `P2-T03:10` moves `withHealthKitBackgroundBootstrap.js` and the `.mm` (the G1
workaround) and `:12` moves the `@kingstinct+react-native-healthkit+14.0.2.patch` with `patch-package`;
`:33` pins **14.0.2 exact**. `P2-T05:47-49` restricts `workoutsToday` to device-recorded workouts (excluding
manual entries, i.e. the S9 filter) and keeps claim-on-open. No Phase 2 task mentions G5's #352 auth-sheet
flash, G4's #330 stale reads, or G6's "no data ≠ denied" coaching copy — none of those strings appear in
`plans/rebuild/phase-2-backend/` (grepped) or in `app-next/src/content/settings.ts:74-81`
(the `without` map says "Running and biking progress cannot update without access", which is the
denial framing G6 says the app can never actually detect).

### 5.4 `docs/research/device-access.md` (dated 2026-08-01)

- **Recommendation: borrow a phone for an afternoon, $0.** Otherwise a used **iPhone SE 2nd gen (2020)** at
  **$78–$130**; budget $90–$130 all-in (`:15-17`, `:32-40`).
- **Motion costs nothing extra** — every iPhone that can run iOS 17.4 has the motion coprocessor; the
  requirement is strictly dominated by the OS requirement (SOFT) (`:20-27`).
- Framework floors are **iOS 15.0** for FamilyControls/ManagedSettings/DeviceActivity (HARD); **our 17.4
  deployment target is the real constraint** (`:28-30`).
- **Do not buy the XR** — same price, caps at iOS 18; iOS 26 dropped XR/XS, the new floor is iPhone 11 / SE 2nd
  gen (`:46-48`).
- **No SIM or cellular plan needed**; Apple ID needed to finish setup; `.individual` does **not** require a
  child iCloud account (`:51-56`).
- **A device passcode is a real gate** — Face ID, Touch ID or passcode accepted; the separate *Screen Time
  passcode* is not required (SOFT) (`:57-58`).
- Device registration is free beyond the $99/yr; **100 devices per type per membership year**; disabling one
  does not free a slot (HARD) (`:59-61`).
- **MDM-managed devices fail** for `.child` (`FamilyControlsError.restricted`, "device is managed by MDM");
  **`.individual` under MDM is NOT VERIFIED** — worth a DTS incident (`:62-65`, `:118-122`).
- **An iPad covers only the blocking half**: Screen Time API is on iPadOS 15.0 (HARD) but
  `CMPedometer.isStepCountingAvailable()` returns **false** on iPad (SOFT, unanimous). Walking detection and
  step cadence are not covered; a used iPad costs more than an SE 2020 (`:69-84`).
- **Cloud device farms are a dead end** — BrowserStack, AWS Device Farm and Sauce Labs all re-sign with a
  **wildcard** provisioning profile, which by definition cannot carry the App-ID-bound
  `com.apple.developer.family-controls` entitlement; the only entitlement-preserving configurations are
  private devices at **$200+/month** (`:86-110`).
- **Apple does not lend devices** (HARD negative finding); DTS code-level support is a listed benefit, but the
  current incident limit is NOT VERIFIED (`:112-122`).
- **Borrowing procedure is fully reversible** — nothing erased, no reset; the owner enters their own passcode
  and we never learn it; delete the app afterwards, optionally toggle ExcerLock off under
  Settings → Screen Time → Apps with Screen Time Access first. The only irreversible part is the UDID staying
  in the developer account (`:124-142`).
- **Three disqualifiers for a borrowed phone**: a work phone under corporate management; a phone already
  running another parental-control or focus app (**iOS allows only one holder of Screen Time access at a
  time**); a phone older than an iPhone XR (`:144-146`).

**How Phase 2 lands:** `README.md:44` lists the physical iPhone (iOS ≥ 17.4, developer mode, connected) as a
Johan prerequisite; P2-T11 is the whole device checklist. Nothing in `plans/rebuild/phase-2-backend/` records
the "one Screen Time holder at a time" constraint as a product/onboarding concern, and no in-app copy covers
"another focus app already holds Screen Time access" (checked `app-next/src/content/`).

### 5.5 `docs/research/gym-location-picker.md` (cited by P2-T05:26)

Not on the required reading list but it is the source P2-T05 §3 defers to, and it records platform limits:
- **`CLGeocoder` is deprecated in iOS 26** in favour of `MKReverseGeocodingRequest`; **both are rate-limited to
  roughly one request per user action** — call once when the pin settles, never during a drag (`:60`).
- **`MKMapSnapshotter` does not draw overlays** — the pin and circle must be drawn on top (`:64`).
- **No maintained RN wrapper exposes `MKLocalSearchCompleter`**; `react-native-nearby-places` 0.4.3 wraps
  `MKLocalSearch` only (`:53`).
- react-native-maps: **Google-provider markers are broken on RN 0.86** (issue 5973); the **Apple provider was
  unverified** at the time of writing (`:46`, `:134`).
- expo-maps 57.0.2 is alpha, **no marker drag on iOS at all**, marker/overlay click **iOS 18+ only**, unclear
  iOS floor (podspec 16.4, README 18, Swift has 17 and 18 paths) (`:37-46`).
- Cost ceilings of the rejected backends: Apple Maps Server API 25,000 calls/day and the key must live on our
  server; Google Places (New) $2.83/1k autocomplete, `displayName` is Pro at $17/1k; Mapbox $11.50/1k after
  500 free sessions (`:54-57`).

---

## 6. What Phase 2 explicitly defers, leaves open, or hands to Johan

### 6.1 Named "ask Johan" / open items

From `plans/rebuild/00-decisions.md:67-76` ("Open items — ask Johan before building anything that depends on
them"), the ones still live for Phase 2:
- **E4** — real **prices, trial length and offer** come from the Adapty dashboard; the 7-day trial in mockups
  is a design example. Blocks: Phase 2 (`00-decisions.md:74`).
- **E5** — whether the current app has any real Adapty-linked customers (the identify call was never wired in
  production, so probably none). **Check the Adapty dashboard before Phase 2 T06** (`:75`).
- E1, E2, E3, E6 are Phase 1 items (`:71-73`, `:76`); E6 (Expo MCP authentication) still gates any Expo
  dependency work in Phase 2 by implication.

From `plans/rebuild/phase-2-backend/README.md:36-44` — the four prerequisites Johan owns (Supabase project +
providers + keys; the Adapty Paywall Builder design and products; `api.excerlock.com` DNS; a physical iPhone).

From `P2-T10:16-18` — **real Terms and Privacy text supplied by Johan**; the placeholder stays flagged until
then and a release guardrail must fail on it.

From `P2-T12:3` — cutover happens **only after P2-T11 passes and Johan says so**.

From `docs/research/gym-location-picker.md:137-141` — three questions listed for Johan, of which two were
subsequently answered by `docs/handoffs/gym-location-picker-build.md:21-35` (centre-pin pattern; slider only,
50–200 step 10) and one by the same handoff's decision to build the real map in Phase 1 (`:3-6`, `:25`).
None remain open for Phase 2.

### 6.2 Decisions Phase 2 explicitly leaves to Codex or to a doc it has not written yet

- **PostHog anonymous-identity policy** — `P2-T07:14-18` states the risk (person-count explosion) and two
  contradictory instructions in one sentence, then says *"Decide with the PostHog docs and write it in the
  README."* Unresolved.
- **Google sign-in library choice** — `P2-T01:16-17`: `@react-native-google-signin/google-signin` **or**
  `expo-auth-session`, "pick per Expo MCP guidance". Unresolved.
- **Supabase JWT scheme** — `P2-T02:14-16`: asymmetric JWKS **or** legacy HS256, "support the one the project
  uses". Unresolved until the project exists.
- **`expo-camera` inclusion** — `P2-T03:34`: only if the gait module requires it; "it uses AVFoundation
  directly; check its podspec". Unresolved.
- **`react-native-device-activity` version** — `P2-T03:32`: "same major as old, check for newer". Unresolved.
- **Keeping `exp-shield-copy-v1`** — `P2-T07:16-17`: "keep… if the shield copy override survives, else drop".
  Unresolved.
- **`signals/screentime`** — `P2-T03:14`: "drop… if only the ledger used it". Unresolved.
- **`prototype/scripts/`** — `P2-T12:10-11`: keep in place **or** move to `design/scripts/`. Unresolved.
- **Vendor research docs** — `P2-T12:12-13`: delete **or** mark historical. Unresolved.
- **Notification implementation** — decision B14 says "Codex decides the implementation in Phase 2"
  (`00-decisions.md:35`).

### 6.3 Things Phase 2 explicitly refuses to claim / defers to a later task

- `P2-T04:51` — "Real enforcement, deny path and shield rendering are **not** claimed here; they belong to
  P2-T11."
- `P2-T04:22-23` — the usage monitor's limitation is **documented, not fixed**: 5-minute resolution, and days
  the extension was not scheduled show as unmeasured.
- `P2-T05:10-12` — background step-goal detection is **accepted as absent**: the extension cannot read the
  pedometer; met detection happens on foreground or app launch.
- `P2-T02:45-46` — `data_export_requested` and `diagnostics_shared` "remain defined but unemitted unless the
  feature exists", i.e. **data export and diagnostics sharing are not built**.
- `P2-T03:18` — `src/e2e/**` is **reduced** to a deep-link → dev-menu scenario loader.
- `P2-T12:8-9` — **Maestro flows deleted**; only node contract tests survive.
- Decision F (`00-decisions.md:78-85`) lists what is out of v1 entirely and therefore out of Phase 2: time
  bank, rate conditions, per-rule app sets, global schedules, badges and share cards, feature voting,
  engagement notifications, push, vendor integrations, swimming/calorie/active-minute conditions, in-app GPS
  tracker, widgets, Live Activities, Siri/App Intents, iPad, Android, localization.

---

## 7. Cross-task contradictions and repo-state findings worth raising

1. **Two notifications vs three.** `P2-T09:3` and `:16` mandate a catalog of exactly two notification ids;
   `P2-T04:26` requires the ShieldAction deep-link notification workaround, which is a third. One of the two
   tasks must change.
2. **"Screens do not change in Phase 2"** (`README.md:18-20`) vs at least four new/changed surfaces the tasks
   themselves require: the "Welcome back" restore screen (`P2-T08:22-23`), the claim-on-open Home line
   (`P2-T05:11-12`), the Apple sign-in button swap (`P2-T01:29`), and gym thumbnails
   (`P2-T05:39-40`, `:65`).
3. **`SyncPort` is too small** for P2-T08/T02 (needs usage-days and profile; see §2), which breaks the
   "same port-level tests the fake passed" law at `README.md:18`.
4. **No `app.config.ts`.** `P2-T01:19-20` and `P2-T06:7` both read env from `app.config.ts` `extra`;
   `/Users/johansardar/ExcerLock/app-next/` contains only `app.json` (verified by `ls`).
5. **`app.json` plugin order is already wrong** relative to `P2-T03:24-28`: today it is
   `gait-vision → react-native-maps → expo-router → expo-splash-screen → expo-font → expo-build-properties`
   (`app-next/app.json:21-42`), with no `withNoPush` first and `react-native-maps` unplaced in the Phase 2
   order. The `plugin-order` guardrail (`P2-T03:20`) will require a full rewrite.
6. **Phase 2 work has already started inside Phase 1**: `app-next/modules/excerlock-gait-vision/` is fully
   ported (Swift + plugin) and `app-next/modules/expo-local-search/` exists with three Swift files, a podspec
   and `expo-module.config.json` but **no JS entry point** — that is P2-T05 step 3 half-done.
   `04-architecture.md:18-20` still asserts "Phase 1 has no native modules, no extensions, no entitlements and
   no config plugins beyond expo-router, expo-splash-screen, expo-font, expo-haptics, expo-build-properties",
   which is now false.
7. **`app-next/modules/excerlock-motion/` is absent** — the `StepsAdapter` substrate (`P2-T05:5`) has not been
   moved.
8. **The two aha unlock screens are unowned.** Decision B20 (`00-decisions.md:41`) added
   `app-next/app/unlock/treadmill.tsx` and `app-next/app/unlock/gym.tsx` with full copy
   (`app-next/src/content/unlock.ts:1-38`) and a `GaitPort` (`app-next/src/ports/GaitPort.ts`), all **after**
   the Phase 2 task files were written (2026-09-06 vs the B20 decision 2026-09-07). No Phase 2 task mentions
   them, and `02-screen-inventory.md` (last edited 2026-09-07) does not list them either — §8 there
   (`:187-192`) still describes only the shield preview.
9. **The privacy copy will be false after P2-T08.** `app-next/src/content/legal.ts:16` promises data stays on
   the device.
10. **`docs/handoffs/onboarding-ui-integration.md:113`** records that a full-repository typecheck is **not
    verified green** at the handoff commit, with known failures in `BootScreen.tsx` style typing and
    gym-picker/native-module work; and `:121` records that `app-next/app/gym-picker.tsx` is untracked and
    carries a lazy-import/Suspense workaround for an `RNMapsAirModule could not be found` startup error.
    Both are Phase-1 debts that Phase 2's N1 milestone (`README.md:32`) inherits.
