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

## Local implementation / review checkpoint (2026-09-10 UTC)

- Baseline preserved in 39ebb52 + 3184cc3; three isolated Muse xhigh lanes running (T01 native,
  T07 cuts, T03 OTA). CLI works; native Muse collaboration does not. Root/Astra review architecture.
- ADR0010 adopts main + four Screen Time appex and main-target AppIntent, corrects contradictory spec.
  Detailed T04 identity/backend-deletion and T10/T11 enforcement contracts prepared outside repo for handoff.
- T02 config implemented: 24 focused tests pass; six live service probes pass with explicit limited scope.
  EAS/CI secrets not yet provisioned; root native config import awaits T01. Preview/prod explicitly refuse
  demo runtime until T10 integrated. No EXPO_PUBLIC_RUNTIME read remains in app-next runtime.
- T03 initial 0d0e7f6 reviewed but NOT integrated/accepted: stale safety across awaits, swallowed required
  persistence, missed native downloaded-state changes/deferred foreground retry, premature success clearing,
  and incomplete binary/dual-store artifact checks. Muse revision running; tests alone were insufficient.
- Root full-suite baseline: 134 suites passed, 2 failed; 545 tests passed, 2 failed. Existing imported UI/test
  drift in conditions-tabs paused header and DayPicker Every day. Baseline lint literal colors in TabBar,
  TimeRangeRow and WorkoutGoalScreen effect. Reconcile in T07/T09; do not weaken assertions indiscriminately.
- Universal ledger updated/committed 024887b: OTA build-profile env is not update env; live safety rechecks.
- No build, TestFlight upload or App Store submission yet; device-only release gates unchanged.

## Integration checkpoint and model fallback

- Root commits:9f6d115 configuration;0928a0b canonical auth/deletion ADR0011;186fa70 persisted detection/
  conditional watchdog ADR0012 (supersedes historical0007/0008);4489b75 SDK4 Adapty correction.
- T03 integrated as5dd8bd7+da05987, then root review fixcb9a3cb: latest native candidate supersession,
  coherent resume snapshots, serialized guard rollback/health acknowledgment.82 OTA tests pass; root
  reports source-level native reload atomicity limit honestly. T10 mounting still pending.
- T07 integrated2355889: removes run/bike and HealthPort product surfaces, per-row migration, one-time note.
  Two pre-existing UI tests remain open; root decision for T09 recorded in task handoff.
- Muse endpoint returned429 and terminated T01 revision/T04 client/T04 server (all exit1 confirmed).
  Uncommitted work preserved. Authorized Sol-low native agents now continue the SAME worktrees:
  /root/ship_native_finish, /root/ship_auth_finish, /root/ship_server_finish. No duplicate Muse processes.
- T01 packaging correction from installed Xcode/SDK: DeviceActivityReport uses ExtensionKit product,
  EXAppExtensionAttributes, .appex suffix and Extensions embed directory; other three use PlugIns.
  Report protocols available iOS16+, compile/runtime still gates. Prior ordinary app-extension advice withdrawn.
- Public Supabase JWKS exposes EC/ES256 key (sanitized metadata evidence); no user token/sign-in proof.
- All work remains local/unreleased; existing main checkout user edits are untouched.

## Native/auth integration, real config, and review checkpoint (2026-09-10 UTC)

- T01 integrated f137755+fdc3a4b from0f4675b+3c1150a; root kept app.json unchanged and dynamic nativeConfig
  authoritative. Native lane verified two clean prebuilds, Pod install and UNSIGNED generic iOS build with
  main+four appex (ExtensionKit report in Extensions). No signed/device acceptance asserted.
- Primary now owns independent node_modules (only symlinks unlinked; original untouched). Supabase2.116
  explicitly declared; native generator patch applies through root postinstall. npm audit43 findings
  (40moderate/3high) remain T13 triage; no force upgrades. Native lane also has independent install.
- T04 server integrated f119f29+23664e7+f85fec4 frombb93b79+b081f91+23e8b5e. Root-reviewed corrections:
  scheduler singleflight/stop, persisted retry attempts, stale claim fencing, immutable provider, legacy Clerk
  migration isolation. Clerk deletion explicitly409unsupported BEFORE destructive work; current Supabase
  deletion works by durable at-least-once vendor-last retries. 173serial server tests and typecheck pass.
  No migrations/deploy yet; deploy requires0006then0007, ES256 Supabase env/service role, worker config.
- T04 auth base5356cce froma7ec17d; exact PostHog integration key fixed8a3369f; identity serialization/revocation/
  token binding/disposal/provider race fixes c50259a+5554b23 from5083422+c1b960e. Root storageb0306ac adds
  copy-on-write UTF-8 chunks, integrity/shape validation, serialized operations, visible erasure failures.
  Root latest auth-focused7suites/53tests pass, app-next typecheck0. Remaining intentional callback ownership
  and fallback timer cleanup sent to auth agent; auth not claimed hardware-verified. Same barrier required T05.
- T02 root931682e: actual Expo CLI uncovered external TS import loader failure (fixed explicit tsx/cjs) and
  invalid common autoIncrement string (moved under production.ios). Actual subprocess config smoke2pass,
  32focused Jest pass, dynamic preview prebuild+prebuild-only verifier pass. CI now runs real config smoke.
  All10allowlisted variables uploaded to EACH EAS environment; GitHub production created with6secrets+4vars,
  under app operations lock. Preview EAS names and GH secret names read back. Six live probes passed again.
  No values logged; no actual build/CI push or release. Initial env attempt failed on schema before upload.
- T01 root9e03053: structured signed-payload verifier enforces actual entitlement values, exact bundles/points/
  embedding, team/prefix/provisioning expiry+allowance, signed Info/privacy and strict signatures. Eight
  validator fixture tests pass; no IPA to validate. No manifest claims substitute for runtime activation.
- Integrated suite before latest auth revisions:182suites pass/2fail;788tests pass/2fail;13snapshots pass.
  Same two baseline UI failures (paused Home status, DayPicker Every day); UI lane actively fixing. Root
  focused lint clean after declaring Node __dirname in CLI smoke. Evidence committed in a270825.
- Live agents reused, all Sol low (Muse429 fallback): ship_native_finish now T08/T09 in NEW ship-T08-T09
  worktree, branch ship/T08-T09, owner codex-ship-ui. ship_auth_finish stays ship-T04-auth, finishes small
  auth fixes then T05 CLIENT. ship_server_finish T05 backend e30d3f5 NOT integrated: root found unsafe
  arbitrary-product premium inference, environment omission in authorizeProduction, guessed Adapty schemas;
  corrections in OLD ship-T04-server requested. Then T06 CLIENT in NEW ship-T06 (owner codex-ship-telemetry).
  Detailed T06 architecture is ~/.local/state/excerlock-ship/tasks/T06-architecture.md. T06+UI links read-only
  into primary independent deps; do not install through them. T01 lane preserved clean with build evidence.
- Root planned watchdog code was NOT started; switched to auth/native correctness review. T10/T11/T12+
  remain. Primary createRuntime still refuses real composition intentionally; do not ship demo runtime.
- Ledger commits7174c65 secure chunk sessions,a992de7 real config loader,4adfff7 signed capability values.
- No simulator was opened/booted here, no signed archive/IPA uploaded, no production code deployed, no
  messages/emails sent. Device/store gates remain. Goal active; substantial implementation remains.

## T10 pure policy started (next continuation)

Root64d3c62 now implements domain/watchdog.ts (supersedes prior not-started note):21tests pass, typecheck/
focused lint0. Only live conditional relief arms; earned/window/lapse/deletion cancel; unknown cannot renew;
context/account/selection guards,5minute cadence,15minute minimum+backdating, explicit cleanup despite stale
previous context, staged monitor budget<=20. This is pure planner ONLY; no root mounting/native enforcement
claim. Remaining T10/T11 scope unchanged. Agents remain live; server is correcting T05 real-schema authority
before T06; UI has substantive changes underway; auth intentional callback ownership fix still pending.

## T05 backend correction and walking reducer checkpoint

- T05 backend accepted revised source1bf2cbb (amended replacement, NEVER cherry-pick e30d3f5), integrated
  02fea0f. Root90ee47e fixes active grace past nominal expiry and preserves trusted webhook authorization
  during ambiguous resync. Only documented access_level_updated/premium/environment writes authorization;
  profile-wide transaction aggregates ack without granting. Resync actual provider fetch is read-only because
  per-env premium binding is unproven in documented profile API; no guessed parsing or active grants. Current
  authoritative production webhook state may authorize, absent/unknown/sandbox cannot.35server suites/
  184tests and typecheck pass after root corrections. Migration0008required; no live deploy or webhook proof.
- Auth narrow34e3487 integratedff20730: intentional SDK callback ownership and fallback timer cleanup.
  Root4focused suites/46tests (auth boot/signout+walking/watchdog), typecheck/lint pass without open-handle
  warning. Actual native provider activation remains unverified. Auth agent now T05client.
- Root8d96b11 adds isolated persisted walkingMachine.ts (12tests):3second qualification,5second silence,
  single first stop-grace deadline, late-wake/clock watermark, duplicate/stale evidence and corrupt-state
  rejection. No JS suspension timer, no fabricated steps. Raw motion/cadence fusion/history/propped/gym/
  persistence/root host remain T11. UI current walking methods not replaced yet.
- UI35cb66f NOT integrated: initial74file slice changes RuleMode (steps|minutes|state, no place) and
  LockedApps {handle,isEmpty}, plus profile walkingPlaces. Root requested full-suite regression reconciliation
  and export completion; agent continues SAME ship-T08-T09. ExportPort boundary being added with explicit
  Settings consent; native sharing adapter/composition still root-owned. Agent export builder reads existing
  AsyncStorageGymVisitLog; T11 must align it to raw persisted visit log, not claim missing data as empty.
- T06 agent now in ship-T06 after backend review, handoff T06-architecture.md. Native privacy manifest's
  ProductInteraction Linked=false needs T13 reconciliation with canonical PostHog identification.
- Root local JSON export transport added: opaque cache filename, availability check, awaited write/share,
  cleanup on dismissal/error/partial write, concurrent-share guard and caller-owned account/consent freshness
  checks before exposure. Native SDK57 adapter uses explicit expo-file-system57.0.6 legacy import and
  expo-sharing.8tests, primary typecheck and focused lint pass. Not yet wired to pending UI ExportPort;
  actual device share sheet, process-death orphan cleanup and generation binding remain integration work.
- Root T11 persisted propped ceremony/handoff reducer: foreground-only generation-bound scan pass,
  verified background retention vs explicit coverage-loss invalidation, single20second pickup and60second
  handoff deadlines, rescan cannot extend handoff, stale scans/late wakes/clock rewind rejected.9tests,
  typecheck/lint pass. Pure policy only; native placement/camera/root wiring and hardware latency remain.
- T05 client8634c4c integratedfb6e36c. Root review corrected inactive grace/lifetime accidentally granting
  active premium; isActive is authority. Added exact async identity checks around loaded plans/refresh/
  purchase/restore, disposed guard and concurrent-operation rejection.22focused adapter/mapping tests,
  primary typecheck pass. SDK/root composition, actual flow exposure and device purchases remain.
- T11 agent now /root/ship_auth_finish in new ship-T11, owns motion/placement/location adapters and
  persisted detection service; root owns native enforcement/root composition. T06 9a10a64 not integrated:
  root found stale-account event/flag races and unstable late flag exposure; corrections delegated same lane.
- Root T10 EnforcementHost serializes root/headless requests, revision-checks after awaits, publishes native
  suppression before cleanup, stages/commits watchdog BEFORE relief, preserves unknown without renewal,
  and only fail-closes eligible states.7host tests, typecheck/lint pass. Native transport contract requires
  atomic revision checks under shared native lock; not yet implemented or device proven. No root mounting yet.
- T08/T09 integrated960de63+6ee5651. Primary full suite193suites:191pass/2fail (882pass/2fail tests),
  both caused by T05 adding successful fake manageSubscription while old UI tests expected native failure.
  Corrected tests to inject actual management-port failure (not obsolete Linking mock);3focused suites/
  17tests, typecheck/lint pass. Root also moved earned relief ABOVE live walking in resolveLock per T10;
  this prevents watchdog-classifying an earned unlock as conditional relief. Legacy lease public model
  still pending replacement, not claimed complete. T10 native agent in ship-T10-native7fdb8f5.
- Root T12 local-only notification planner/SDK57 Expo backend: trial expiry minus2days, eligible
  closed-target discovery reminder, fixed identifiers with serialized replacement, OS permission recheck,
  stale account cancellation and strict tap URL allowlist. Removed walk-lease warning port/fake method.
  6tests, primary typecheck/lint pass. Native factory supplied, root scheduling/tap mounting still pending;
  ShieldAction shield_open delegated native agent. No push token registration and no device delivery claim.
- T06 base/review corrections integratedd3827ec+6653c9f: originating identity binding, stable singleflight
  flags and explicit settled-value exposures, stricter crash scrubber. Concrete PostHog factory/queue
  storage and real Sentry binding still same agent task; no ingestion/symbolication proof.
- Root added concrete typed SDK4 Adapty binding and createIdentityServices composition: one auth graph,
  exact shared purchase/restore barrier/readiness, real analytics hooks required, native management URL,
  deletion callback required and idempotent disposal.4focused suites/16tests + primary typecheck/lint pass.
  Not mounted as real Runtime yet; no preview/devices or fake-to-real activation claim.
- Root T09 production dev exclusion implemented via Metro file-map blocklist (preview/prod or production
  bundling), stripped navigator registration and absent Settings handler in release. Actual Expo iOS export
  with synthetic preview env succeeded; complete2216-source map contains neither app/dev.tsx nor features/dev,
  compiled router context has no ./dev.tsx. Verifier scripts/verify-no-dev-bundle.cjs and evidence/ship-T09.
  This was no-bytecode diagnostic export, NOT signed release/device activation. Typecheck/focused lint pass.
- Review T11 f566dac returned to agent for serialized durable wake updates, motion timestamp validity,
  coverage-loss dwell resurrection, deep schema guards and history idempotency; not integrated yet.
- T10 native38e1e753 + corrections01f465b7/60c8a841 NOT integrated: root caught end-callback time
  bounds/out-of-window shields/stale staging and requested actual independent install+prebuild+unsigned build.
- Concrete PostHog/Sentry SDK factory integratedb4616eee. Root added missing Settings Usage analytics
  switch + persisted analyticsEnabled; adapter opt-out clears queues, invalidates flags and gates captures;
  opt-in requires current preference/canonical identity. Fixed actual UI walk_places array normalization
  to enum person property and event.2focused suites/15tests, typecheck/lint pass. Factory/root still needs
  analyticsEnabled getter binding; Settings visual inspection pending. T10-domain migration delegated
  ship_server_finish; T11 reviewed fixes22ae5f17 ready, native factory/headless binding next same agent.
- Root found native Google OAuth client ID present but no registered reverse-client-ID redirect scheme.
  Added one shared config derivation: scheme array preserves excerlock and registers reversed Google ID;
  clientAuth.googleRedirectUri uses same scheme:/oauthredirect for root AuthSession/code exchange.
  Official Google native OAuth docs consulted; actual Expo loader2tests/typecheck/lint pass. Signed plist
  and physical Google completion still required. Universal ledger19f455d records diagnosed mechanism.
- T11 review found history key upper bound changes on retry after successful credit/failed cursor save,
  allowing overlapping double-credit. Agent now persisting pending intent before root credit and testing
  new-wake retry; no false exactly-once claim. Native/domain/factory agents remain active.
