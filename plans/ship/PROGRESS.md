# Ship execution status

Authoritative implementation checkout: `/Users/johansardar/ExcerLock-build/ship`, branch `ship/implementation`.
Owner: `codex-ship-orchestrator`. Base HEAD: `99dc73f`. Current user edits and untracked source/spec files
were imported from the main checkout without changing it. Baseline patch/inventory lives outside git at
`~/.local/state/excerlock-ship/`. The imported app baseline remains uncommitted. Existing site commits were cherry-picked, followed by the
reviewed AASA fix at `681b9e4`; source site worktree remains untouched.

## Current gate: T00 (in progress)

- PASS: Family Controls distribution request history inspected separately for main, monitor, shield,
  shieldaction, report. Each Assigned detail shows Team requests 467V4M9Y95 and UY4548S755 Approved.
- PASS: main App ID now includes Apple sign-in, push and associated domains. API readback saved.
  Actual API enum is APPLE_ID_AUTH with APPLE_ID_AUTH_APP_CONSENT / PRIMARY_APP_CONSENT settings;
  SIGN_IN_WITH_APPLE in T00 is rejected by Apple. No app build has been signed yet.
- PASS: Paid Apps Agreement, bank account, US W-9 and DSA Active in signed-in ASC Business page.
- PARTIAL: six named subscriptions exist, have en-US names/descriptions and verified USA pricing:
  A monthly/annual/winback $9.99/$59.99/$29.99; B $12.99/$79.99/$39.99. Review images absent.
  Existing paywall screenshots show placeholder prices and cannot honestly prove the final paywall.
  Leave other 45 products unchanged.
- PARTIAL: Supabase Apple/Google/email/anonymous enabled, manual linking enabled; native Apple bundle ID
  registered. Two Google client IDs recorded. Apple Services ID now registered with ExcerLock primary app, correct
  domains/callback, and persisted first in Supabase accepted client IDs. Native-device auth unverified.
- PASS: Expo account Free; official docs restrict code signing to Production/Enterprise. No upgrade or
  certificate generated. Signing is conditional in the ship spec; no claim tampered-manifest testing passed.
- OPEN: physical iPhone 13 “Il” listed but unavailable; user asked to connect/name device and confirm sandbox.
- PASS: AASA deployed additively under app operations lock, no redirect, HTTP 200 application/json, exact
  app ID with empty paths. Site, www and API health passed. Caddy backup retained remotely. Site source and
  dual-vhost Caddyfile integrated into ship checkout to prevent later API deploy deleting the site config.

Evidence: `app-next/evidence/T00/`. Audit logs and Muse outputs: `~/.local/state/excerlock-ship/tasks/`.
Muse audits ran concurrently; initial read-only sandbox blocked network/Keychain, live retries succeeded
using full-access processes constrained by read-only task instructions. Use explicit appropriate sandbox
settings on future Muse CLI launches; preserve task scope. Native Muse collaboration remains unsupported.

## Remaining full scope

T01 native manifest/port; T02 config/secrets/EAS; T03 OTA; T04 identity/auth; T05 Adapty/paywall;
T06 telemetry; T07 activity cuts; T08 walking/onboarding; T09 picker/settings; T10 enforcement/watchdog/root;
T11 detection adapters; T12 notifications; T13 review readiness; T14 device+sim verification;
T15 performance; T16 TestFlight, review submission and verified public OTA after approval.
All remain unproven. Honor README row gates; do not mark implementation complete from prerequisite checks.

## Architecture issues to resolve before assigning implementation

Astra read-only review identified: watchdog applies only to live conditional relief (never earned/outside
window/lapsed); stale extension callbacks need generation/state guards; native Apple must link anonymous
identity using a supported linkIdentity token overload; existing-account sign-in requires explicit migration;
provisional UUID cannot be assumed to become Supabase UUID; gate purchase until canonical identity; deletion
needs idempotent backend orchestration. Future window background startup, heartbeat freshness and watchdog
jitter require hardware evidence. Force-quit geofence scenario contradicts the no-relaunch model and must
separate system termination from deliberate force-quit. Main+4 Screen Time extensions versus a fifth App
Intents target needs a consistent native inventory. Record final decisions in ADRs, preserve superseded ADRs.

## Pending user input / gate interpretation

Asked asynchronously to connect/name physical iPhone and confirm sandbox account. Also asked whether local
implementation may proceed while preserving T00 device/screenshots as mandatory build/submission gates:
T00 currently prohibits implementation, but its truthful review screenshot depends on T05 real paywall.
No answer received yet; do not treat elapsed time as permission to change the work-order gate.
This is the first goal turn encountering this dependency; do not mark the full goal blocked or complete.

## Process ledger (2026-09-10 UTC)

Muse read-only audits and corrected live retries completed; reports saved. Astra architecture and domain
agents completed. Domain deployment session 17778 finished with exit 0; source commit 02a660d on ship/aasa,
cherry-picked as 681b9e4 on ship/implementation. No build or upload submitted. No simulator booted here.
Physical device discovery showed iPhone 13 Il (F4E839C0-3F05-5BF8-BA31-12949B2B83AB) unavailable.

## Continuation 2

Previous turn classified as progress (capabilities, AASA deployment and verified prerequisite evidence).
Device rechecked: still unavailable. No answer to pending gate/device questions. Six subscriptions re-read
by A/B group, still MISSING_METADATA; one app-wide API read failed on the unrelated 45-product group,
while both targeted required groups succeeded. Saved targeted responses; no empty evidence file retained.
Registered Apple Services ID com.johansardar.excerlock.signin (4NQNWBP93L), enabled Apple sign-in with the
ExcerLock primary App ID and expected Supabase callback, and verified persisted Supabase client-ID order
against official docs. No private key generated or web auth asserted. Quarantined the empty root app.json
created as an unintended side effect of the earlier EAS audit command. Only read the existing simulator's
AX tree; did not change, stop or boot a simulator.
Second consecutive turn with the same device/work-order gate pending. Meaningful prerequisite progress
was still possible, so goal remains active. Do not mark complete.

## User authorization update

Johan explicitly authorized proceeding with all work without further questions. Local implementation may
run in parallel now; physical-device, truthful review screenshot, and submission evidence remain mandatory
release gates. Prior pending work-order question is resolved. Original T00 sequencing is overridden by the
latest user direction; no acceptance requirement is removed. Architecture/integration remains with root or
Astra low. Muse xhigh handles bounded implementation; root reviews changes and validates integrated results.
