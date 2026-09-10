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
- Root createClientServices now binds actual PostHog/Sentry+auth/Adapty from strict public extras, live
  analytics consent/profile/OTA context, typed experiments, native local notifications and account-bound
  serialized JSON export. Still deliberately not substituted for full Runtime until enforcement/detection
  ports are composed. Added per-request notification generation check (including queued requests).
  3focused suites/10tests, primary typecheck/lint pass. Payload assembly account binding still pending.
- T11 factory/durable pending credit correctiond29b7498 ready for root integration; root must atomically
  dedup history credit intent before callback resolves. Agent moved to independent T13 audit/fixes.
- Native unsigned build fails in Swift Expo result-builder compiler assertion; root requested typed
  service-method extraction and repeat actual build. Report ExtensionKit regression restored by agent;
  none of native T10 commits integrated until review/build. No signed/device proof yet.
- T11 reviewed adapters/factory integratedf0ac15d2+ea44912d+db37e615. Primary4focused suites/19tests and
  typecheck pass. Root fixed duplicate-write path: detectionStore now opts out of automatic Zustand writes;
  explicit complete-snapshot durability commits serialize through one writer, preserving pending intent/
  credit cursor ordering.2focused durability/service suites/7tests and lint pass. Root history transaction
  dedup still required. Universal ledger updated for middleware-vs-explicit write race.
- T10 native agent finally reports unsigned generic workspace build PASS after thin typed Expo result
  builder refactor1bce3e83; native chain still root review pending. Same agent now real ScreenTimePort mapping.
- Native T10 buildable chain integrated2044eb1a through682aa845 (includes report regression+restoration
  as historical commits; HEAD preserves ExtensionKit). Root host now replaces exact supplied future
  windows before applying, clears them on confirmed lapse, skips unchanged schedule and force-reapplies
  on wake.2focused suites/12tests typecheck/lint pass; native source assertions NOT device proof.
- Native recurrence/DST review fixes + concrete ScreenTimePort232c3fd5 ready; root caught old start guard
  preventing subsequent weekly locks and fixed-week modulo diverging from DST calendar. Agent reports
  incremental unsigned build pass. Await root integration/review, no hardware acceptance claim.
- T10 domain1906b2cc ready: public lease/WalkingSession removed,198suites/903tests pass in lane. New
  WalkingPort snapshot/check; root adapters need detection timestamps, not invented current-time evidence.
- Native ScreenTimePort232c3fd5 integratedc593a5b4. Root corrected old lane count-shaped picker output
  to {handle,isEmpty}, reads actual authorization on status call, surfaces native auth request errors,
  preserves prior persisted selection on cancelled picker.4port tests/typecheck pass.
- Root prepares real Runtime discrimination, disables Home demo progress/gym writers for real runtime,
  blocks demo query-parameter mutations outside dev fake mode, removes real treadmill reliance on
  runtime.dev.setPlacement (walking.start options now owns it).5targeted tests + focused lint pass.
  Also prevents legacy fake step updater from incorrectly crediting minutes with step counts. Complete
  Runtime construction/headless root still pending actual walking/gym adapters and history transaction.
- Root adds HistoryCreditLedger: one atomic serialized record stores measured daily totals AND dedup
  cursor, retries after process recreation don't double-credit, failed commits don't advance, overlapping
  scalar ranges/midnight-spanning totals reject instead of fabricated prorating. Root must initialize
  detection query cursor from committed ledger and split history at local-day boundaries.5tests pass.
- projectStepHistory converts measured totals only to enabled scheduled walking STEP targets, never
  minute/state rules; get-ahead allowed, earned timestamp preserved, reproject idempotent.2tests pass;
  typecheck/focused lint pass. Still needs root callback and hydration projection wiring before shipping.
- GymPort8c9755a1 ready review; native clock/support next. WalkingPort implemented/under full lane tests.
- Integrated native Gym/clock/support/Walking chains (e6f72214,0b9e2cfb,b5bb8ee4,ff3fc847).
  Root corrected enable-auto-detect missing the mutation queue: a late enable could resurrect registration
  after disable; regression test and typecheck pass (1b9a081b).13focused native-port tests pass.
- Integrated T13 audit/metadata chain through a832e823. ASC metadata readback now truthful and canonical
  public URLs verified. AASA empty paths deliberately retained per native manifest (no universal routes).
  Still no store build, submission, screenshot assets or product-review screenshots.
- Production hydration barrier06cbaefe includes detection and checks Zustand hasHydrated, because read
  errors are swallowed by middleware. Waits for ALL stores to settle before recovery.3tests/typecheck/
  focused lint pass; cross-app pitfall recorded c7305fb. Actual production root construction still pending.
- Exact weekly schedule planner + recurrence correction integrated2ca2f8f1/05255a6b/3e2b83e7.
  Preserves disjoint gaps; past recurring anchors accepted; earned suppression expires at eligibleUntil.
  Root rejected agent's silent full-week callback skip: final code explicitly returns
  nativeFullWeekUnsupported and native rejects equal cyclic boundary components. All-week support is an
  OPEN RELEASE GAP, not a passed feature; >7 exact union windows also explicitly unsupported. DST
  spring/fall all-week rejection covered.11planner/native SOURCE tests pass, not Swift runtime proof.
- Integrated full Jest checkpoint (before subsequent schedule tests):216suites/973tests/13snapshots PASS,
  /tmp/ship-integrated-jest.log. Latest targeted schedule/native11tests + typecheck pass. No signed/device
  acceptance implied. Auth agent refactoring production status, server agent finishing ledger cursor/
  midnight pending replay; root full Runtime remains the largest open task.
- Superseding the temporary full-week limitation above: root directed daily boundary partitioning,
  integrated c8ad4d99. All-week now7 exact local-midnight windows; no merging across day boundaries,
  so next-day earned suppression expiry has a native start callback. Spring/fall DST and cross-midnight
  coverage tests pass. >7 disjoint day-partitioned windows still explicit inability, never broadened.
- Root policy projector996d9181 maps confirmed lapse/deletion/disabled cleanup, unknown preservation,
  current-window live deadline and earned suppression's NEXT relock deadline (not current window end).
 8tests/typecheck/lint pass. Recurring anchors never mistaken for current window instances.
- Production-safe Runtime.status now integrated34bfb9e0; dev optional, consumers migrated and guards
  explicit. createRuntime still intentionally refuses real mode until full production composition exists.
  Native agent now verifying clean preview prebuild/unsigned build at integrated HEAD; history ledger
  agent reviewing pending-intent timezone preservation before final commit.
- Integrated durable history930281ab: DetectionWake now requires timezone; createNativeDetection owns
  and returns HistoryCreditLedger (no injected creditHistory). Pending intent carries origin timezone;
  exact replay precedes new queries after restart/travel; local-midnight split and8segment/wake cap.
  Root fixed two old walking test constructors after contract integration (1aa62a44).
- Root RuntimeEnforcementSource8b14f5a2 seeds revisions from durable native revision and reads live
  inputs during in-flight native awaits, not only queued root callbacks. Stable clock ticks do not churn
  monitors; account/selection/rule/eligibility changes revoke old authority immediately. Explicit cleanup
  still succeeds with an otherwise unrepresentable >7-window schedule.5tests plus history/walking tests
 20total pass and typecheck pass after integrated test fixes.
- Fixed native walking external-store snapshot identity2d43b168: scalar-equal snapshots stable; local
  start/stop, persisted detection and placement notifications propagate. Root requested headless registry
  cold-bootstrap singleflight/no-silent-success and pure measured gym progress projection in parallel.
- Next root work remains actual async production Runtime graph/startup mount and one reconcile loop;
  the production constructor still refuses fake fallback. No device or store activation claims.
- Native clean preview prebuild/pods/unsigned generic Debug iOS build VERIFIED PASS at34bfb9e0;
  /tmp/native-verify-build.log ends BUILD SUCCEEDED. No simulator/signing/upload/device activation.
- Integrated headless bootstrap484ea036 (singleflight initializer, missing handler explicit error),
  gym progress7f4d14cf (confirmed union minutes/event, midnight-safe), lightweight detector tickaf63edd8
  (no history query, committed observers, permission-denied history-free wake).
- Root actual async createRealRuntime graph now3dee241a, not yet public startup-mounted. Hydrates before
  native/client construction, native-only ports, native revision source, one serialized full/tick/committed
  root reconcile, persisted step + confirmed gym projection, permission refresh/grant restart, root
  headless callback, foreground ticks, background lightweight wake, disposal cleanup. Explicit unsupported
  cloud sync errors rather than fabricated remote success. Production dev surface absent.
- Root corrected detector full-wake final committed notification (agent missed zero-history segment case);
 17DetectionService tests/typecheck/focused lint pass. Enforcement reads committed walking/gym snapshots,
  not raw pre-persistence Zustand notifications. Factory-specific mocked tests in server lane pending.
- OPEN before mounting/release: actual history status readmodel (native agent), after-confirmed deletion
  cleanup callback/provisional deletion (auth agent), single shared async factory bootstrap/provider mount,
  OTA/notification roots, walking-minute durable source, full device/store verification. Public createRuntime
  still refuses real mode until bootstrap wiring replaces it; no success claim for installed production.
- Production startup is NOW MOUNTED (074844eb), superseding earlier refusal notes: createRuntime('real')
  resolves one VM-owned async RuntimeSingleton shared by provider and cold tasks; custom index.js
  registers bootstrap/tasks before expo-router/entry per official docs. Startup failure uses designed
  retry surface, never a fake fallback. Real native picker mounted; FakePromptHost requires fake kind.
- Integrated measured status history7f971d0f, confirmed deletion3f3b47f4, durable erasureeb390119 and
  real graph constructor tests81e4ff38. Local erasure only post204/410/tombstone; provisional deletion also
  suspends+erases. Middleware per-key barrier prevents old writes overwriting reset. Root deletionSuspended
  stops queued tracking work, resumes on canonical recovery, clears after tombstone boot. Native selection
  erasure/late raw task writes still under privacy review, not claimed proven.
- Actual preview production iOS Expo export now contains real runtime graph and NO demo sources,
  dev route or dev implementation:3967sources. /tmp/ship-production-export.log, dist/ship-production-check.
  Strengthened verify-no-dev-bundle.cjs asserts real graph present and demo graph absent. Diagnostic
  no-bytecode export uses synthetic config only; not signed installation/device activation.
- Latest integrated typecheck/focused lint PASS; full Jest226suites/1033tests/13snapshots PASS,
  /tmp/ship-runtime-mounted-jest.log. RuntimeSingleton UI/headless concurrency/failed-boot retry/teardown
  interleavings covered. ADR0013 records actual async ownership and remaining gates.
- Remaining root work: OTA/notification lifecycle root hooks and safe boundaries, walking-minute measured
  progress, persisted day sealing/retention, raw-task deletion races, actual native startup/UI inspection,
  signed build/TestFlight/AppStore/public OTA gates. Root provider UI tests, motion-source investigation
  and deletion review delegated; no release success claimed.

### Continued production integration — 2026-09-10

- Mounted guarded OTA/notification root effects (5f11482c, 996e963e): live prompt/camera/purchase/
  walking/AppState safety, post-flush healthy launch acknowledgement, permission refresh, reminder
  cancellation/scheduling and allowlisted deduplicated notification routing. Device OTA delivery unproven.
- Privacy cddc4833/6e7dcac0 serialize raw gym log writers across foreground and TaskManager, durable
  suspension and region allowlist reject obsolete callbacks; selection removal bridge deletes only the
  owned handle. Clean unsigned native rebuild including changed package patch is underway in a dedicated
  worktree, not claimed verified by the older build.
- Walking duration a7c4bc29/4c62dd21 credits adjacent verified committed observations only, caps gaps at
  5 seconds, splits original local midnight, acknowledges after RuleDay persistence, resets after deletion.
  No step-to-minute conversion or invented historical open tail. Full checkpoint: typecheck/lint and
  232 suites / 1057 tests / 13 snapshots passed (/tmp/ship-effects-minutes-full.log).
- Added immutable production calendar-history sealing + first-observation anchor, gap missed days,
  400-calendar-day public history bound and 35-day rule accounting retention. Included in owned-store
  hydration/erasure. ADR0014 records limits: raw sensor retention, catch-up completeness before sealing,
  progress day ownership and timezone convergence still open. Focused 4 suites /14 tests and typecheck pass.
- Dedicated lanes handling generation-bound async export construction and fail-closed native cleanup
  ownership. No signed build, deployment, store submission, public OTA or device activation claimed.
- Follow-up full checkpoint after sealing/export: 234 suites /1067tests /13snapshots PASS,
  typecheck PASS and lint0errors (48existing warnings), /tmp/ship-seal-export-full.log. The first sealing
  full run caught the fixed eight-store count assertion (now nine); do not cite that failed run as success.
- Actual synthetic preview Expo iOS export at63c1e487 PASS,3974sources, real graph present and no demo/dev
  graph. /tmp/ship-production-export.log. Still diagnostic no-bytecode export, not signed launch proof.
- Native lane clean install/prebuild/pods/unsigned generic-device Debug build at4c62dd21 **BUILD SUCCEEDED**,
  /tmp/excerlock-native-removal-build.log. Changed selection removal bridge compiled; custom entry resolved.
- Simulator runtime verification blocked by an existing unowned booted ExcerLock-Next B68873CD-B6ED-4961-85AF-0C807E657999
  (idb companion sinceSep9); did not boot another or interfere. Physical Il remains unavailable (last connected
  Sep6), so no real-runtime device acceptance. Valid development/distribution identities exist, but report
  extension development profile and all ExcerLock distribution profiles missing. No signing/upload attempted.
- Integrated fail-closed cleanup37d09b05: aggregate independent cleanup failures and block new native runtime
  for VM lifetime when ownership cannot be proven released; ordinary boot failure still retryable.
- Raw retention APIs59947dc5 preserve cursors/pending/open-visit boundaries. Root wiring after archive and
  RuleDay persistence underway; review identified gym log cursor atomicity/rewind/corruption fixes in lane.
- Raw post-seal retention now wired through serialized DetectionService/root. Durable archive+RuleDay
  barrier precedes pruning; cursor/pending/open-boundary preservation and daily dedup. Root review fixed
  raw gym generic return typing, cursor-first partial-write safety, monotonic rewind handling and malformed
  cursor fail-closed (03d72361). Added root barrier-failure/ordering tests and concurrent unsafe-init disposal
  rejection. Integrated typecheck PASS; 5 focused suites/36tests PASS /tmp/ship-retention-integrated.log.
- CRITICAL OPEN correctness audit (server lane): calendar totals cannot correctly credit overnight instance
  ownership. Mon20–02 with4000Mon steps+1500Tue before00:30 must make Monday RuleDay5500 while History
  stays4000/1500; current projectors skip Tue or write only Tue row. Same bug29Mon walking minutes+2Tue.
  B8 says measure from midnight of INSTANCE day through min(now,instance.end); overlapping Monday-active
  and Tuesday-get-ahead accounting can legitimately both use Tue morning facts. Scalar day totals observed
  after02:00 cannot be clipped truthfully. Root architecture next: retain exact verified walking segments;
  retain exact step query slices/prefixes split at instance ends; never prorate scalar steps. Preserve legacy
  earned rows; never infer timestamp ownership from old aggregate totals. Add progressDay helper, Mon-only/
  Mon+Tue overnight, late-wake cutoff, DST, replay and migration tests. References P2-T15§4/§6 and product
  model§4/§5; T11§8 unchanged. This remains a release-blocking correctness gap, not solved by sealing alone.
- Latest full integrated retention/cleanup checkpoint atbcc44e09: typecheck/lint PASS,
  234suites/1081tests/13snapshots PASS (/tmp/ship-retention-final-full.log). Subsequent startup recovery copy
  distinguishes unsafe cleanup (close/reopen required, no futile retry) from retryable boot error; targeted
  production-provider5tests/typecheck PASS (/tmp/ship-restart-ui.log). Actual simulator UI remains unverified.

### Exact overnight accounting and DST — 2026-09-10

- Environment change discovered while working: original ExcerLock was moved intact to
  `/Users/johansardar/ExcerLock-backup-20260910-104501`, leaving a new empty initialized original. Verified
  rootHEAD117f9c4f and worktree records in backup; reconnected ONLY four active owned worktree .git files
  to existing backup metadata. New empty original untouched. Future Git/release operations must not assume
  original path still hosts this project. Root source remains ExcerLock-build/ship.
- Exact walking segmentscd04f2aa survive ack/restart, original-zone midnight split, adjacent-only merging,
  strict validation, pending-safe retention; legacy missing segments migrate empty, never inferred totals.
- Exact step checkpoints8d0f37fd preserve calendar-credit cursors, serialized generation-fenced native range
  queries, exact endpoint cache, atomic persistence and400day retention. Root new domain/projector wiring
  fixes Mon-only and Mon+Tue20–02 accounting without prorating steps; exact walking/gym intervals provide
  measured minute thresholds. Overnight calendar seals defer until the accounting window closes.
- Walking origin timezone866db716 stays fixed across consecutive verified observations and resets after
  negative evidence. Root source-frame projection protects same-evidence travel/replay ownership.
- Native cleanup45d3d907 now propagates adapter/service/factory stop failures. Root review corrected
  stop's queued-data error handling: wait for settled queue, but keep query/persistence failures in flush;
  an ordinary reported data error must not masquerade as unsafe native teardown after all stops succeed.
- Deterministic DST resolver9762ad9b fixes backward spring gaps in Adelaide/Lord Howe; explicit convergence,
  earliest fold occurrence, forward gap shift, collapsed windows omitted. ADR0015. Root added bounded
  result cache and accounting midnight convergence assertions in development. ADR0016 describes exact
  instance accounting. Focused overnight+root/service checkpoints pass; full integrated check underway.
- Independent review caught two further issues, now corrected: final unpruned RuleDays commit BEFORE
  immutable archive (then prune/ack after archive), preventing a cross-store crash from permanently losing
  final per-rule achievement; source-zone overnight end deadlines also defer sealing after east/west travel.
  Fault-injected crash/restart and Chicago→NY premature-seal tests pass. Goal notifications now wait until
  measured facts are durable. Explicit persisted-store retry0546177a avoids a recovered disk remaining
  stuck on an unchanged failed snapshot; retry only the latest failed serialized operation, never old state.
- Intermediate full overnight checkpoint:237suites/1130tests/13snapshots PASS. Subsequent review fixes
  passed typecheck and targeted3suites/28tests (/tmp/ship-recovery-final.log); final fresh full check follows.
- Fresh full exact-accounting checkpoint at a4c738bc: typecheck/lint PASS,237suites/1137tests/13snapshots
  PASS (/tmp/ship-exact-final-full.log). Fresh synthetic preview production export PASS:3975sources,
  real graph present, no demo/dev graph; actual export verifier PASS. Not signed/device proof.
- Subsequent native-recurring DST review found shifted epoch anchors would change Swift-extracted
  weekly wall minutes (02:30→03:30) or invert intervals. f7258bb6 preserves converged current-week anchors,
  otherwise searches bounded same-weekday exact anchor pairs; union/day partition unchanged and explicit
  unavailable result. Typecheck and focused schedule/calendar/policy suites pass. Added direct development
  midnight convergence assertion regression; device recurrence still unverified.

### Schedule repair and live release inventory — 2026-09-10

- b173449c validates complete proposed native schedules before rule save/enable and onboarding commit;
  all production callers pass ClockPort context. Disable/delete remain available for recovery. Typed
  rejection keeps builder/onboarding open and preserves old rules. Focused 3 suites/24 tests and typecheck
  pass. Root reviewed production callers and mutation ordering.
- Unsupported hydrated schedules no longer fail startup: unknown enforcement preserves existing bounded
  native policy; deleting/disabled/lapsed still clear. Typed runtime issue replaces normal Home lock claims
  with Conditions repair navigation and persistent Conditions notice. Source revisions still invalidate
  in-flight work. ADR0017. Root 3 suites/17 tests, typecheck pass; lint 0 errors/52 existing warnings.
  Actual device UI/native protection remains unverified. Full integrated suite running next.
- Read-only live GCP inventory discovered applied superseded migrations0006/0007. Current rewritten0006
  would fail on duplicate auth_deleted_at; five baseline feature/vendor tables were dropped by old0006.
  Forward-only compatibility bridge and actual legacy-schema upgrade proof are required before deploy;
  no applied history edits or remote mutation. Live /ready200 only proves OLD deployed code requirements.
- Production durable PostHog deletion credentials are absent (personal API key/project ID); current
  deletion readiness therefore false. No secrets printed or remote environment modified.
- Fresh ASC inventory: zero builds, version1.0 PREPARE_FOR_SUBMISSION; seven validation blockers including
  review details/build/screenshots/availability/rights/age fields. Six target subscriptions still missing
  review screenshots; other45 untouched. Five bundle IDs exist, live distribution profiles absent.
  No upload, submission, deploy, main push, or public OTA performed.
- Independent recovery review found cleanup could retain misleading uncertainty copy. Corrected:
  deleting/disabled/lapsed source snapshots carry no issue; existing notice clears only after successful
  current-revision native apply, not after a plan repair whose native write fails or is superseded.
  Regression root/source/host 3 suites/28 tests pass (/tmp/ship-schedule-review.log).
- Fresh integrated checkpoint7619c5bd:238 suites/1154 tests/13 snapshots PASS, typecheck PASS,
  lint0errors/52existing warnings (/tmp/ship-schedule-final-full.log). Distribution verifier9Python tests
  and shell syntax PASS; this strengthens release gate, not evidence of an actual signed IPA.
- Live identifier-level FAMILY_CONTROLS_DISTRIBUTION is present on all five bundle IDs; portal approval
  evidence independently records approved team requests. No App Store provisioning profiles yet; agent
  preparing exact clean-checkout signed build procedure. Device recheck: Il still unavailable; booted
  ExcerLock-Next remains another session's simulator, unchanged. No device activation claimed.

### Production compatibility integration — 2026-09-10

- Integrated18040883 as c26bac8f: forward-only bridge, renamed unapplied0007–0009 sequence, restored five
  API tables, strict readiness columns/valid-index/composite-PK checks. Root review added fail-closed
  ambiguous provider precondition, table-bound constraint joins, valid/ready index verification, and
  original journal retention/idempotent replay proof. ADR0018 records the decision.
- Fresh integrated server verification:36files/192tests PASS, typecheck/build/Drizzle check PASS
  (/tmp/ship-server-bridge-integrated.log). Exact deployed legacy SQL fixtures preserve all8 historic
  rows, migrate to12, and replay unchanged; fresh migrates to10. No remote mutation/deployment.
- Created clean detached build checkout release-7619c5bd, claimed codex-ship-production-artifact.
  Native lane preparing reviewed manual-distribution archive script. Root rejected archive deletion,
  production-only dependency install, and automatic-signing assumptions before execution.
- Local PostHog personal erasure key absent; project/browser connection attempted but CDP timed out.
  No credential creation/storage/transmission. Server erasure activation remains unverified/unconfigured.
- Release-locked artifact preparation attempted from clean pinned7619c5bd checkout. Created five missing
  IOS_APP_STORE profiles; first four passed strict team/certificate/Family Controls/app-group checks and
  installed. Report profile validation failed before dependency installation/archive (assertion at group
  validation), so sequence stopped and lock released. Read-only portal/profile diagnosis assigned; do not
  blindly recreate profiles or claim signed artifact. No build upload, submission, or API deploy occurred.
- Report profile diagnosis confirmed:735XMH25VL has correct Family Controls/distribution/certificate,
  but an EMPTY App Groups entitlement. Capability toggle APP_GROUPS exists; intended group association
  is missing. Universal ledger31b7e42 records this distinction. Read-only `asc web app-groups list` with
  the exact Apple ID failed: password required, no cached web session. Browser CDP also unavailable.
  No group assignment or profile deletion performed. Signed build remains gated on portal session/repair.
  Separate unsigned Release compilation/Hermes-size verification assigned; it cannot substitute for signing.
- Unsigned generic-device production Release build at7619c5bd SUCCEEDED. Actual packaged Hermes v98
  bytecode is7,881,912bytes (7.517MiB), FAILS T15<=4MiB. Actual source map3946sources passes no-dev graph
  verifier, exact3PlugIns+1ExtensionKit report packaged. Artifacts preserved at
  /tmp/excerlock-unsigned-release-7619c5bd-20260910-114438-16097. Bundle-size attribution underway;
  do not loosen the budget or treat unsigned native compilation as runtime/signature acceptance.
- Correction: that local Release build's existing Sentry phase DID upload an artifact bundle for release
  com.johansardar.excerlock@1.0.0+1/dist1 (bundle1bc84d7c-0fb1-54cc-8fd4-addffdd1dd58). The lane's earlier
  no-remote-mutation statement was incorrect. No remote deletion/reversal attempted. Root inspected
  installed Sentry scripts and now requires SENTRY_DISABLE_AUTO_UPLOAD=true plus unset SENTRY_AUTH_TOKEN
  after env injection for verification builds; pending signed preparation script corrected. No ASC upload.
- Integrated Home semantic clock e3321c92 as aec6dfe4:239suites/1158tests/13snapshots PASS,
  typecheck PASS, lint0errors/52warnings (/tmp/ship-home-clock-integrated.log). Exact interval cache
  suppresses unchanged Home derivation while root enforcement clock remains untouched. ADR0019.
- Integrated production readiness3c94c76b as bb3db21e:197server tests/typecheck/build PASS
  (/tmp/ship-readiness-config-integrated.log). /ready now refuses missing production erasure config even
  with migrated schema; health remains independent and failure details never expose secret names.
- Bundle diagnosis: Sentry web/replay export graph dominates mapped JS spans (proxy, not HBC byte
  attribution). Read installed Sentry7.11.0 Metro implementation: supported includeWebReplay:false
  excludes unused browser replay while retaining native crash handling. Root regression RED reproduced
  missing replay exclusion; supported config fix GREEN. Actual differential HBC export running.
- Experimental Expo57 optimize-graph/tree-shaking command-only probe produced6,544,816byte HBC,
  still over4MiB; no experimental flags enabled in committed config. Source graph2990sources passes
  no-dev verifier. This experiment is synthetic preview config, not a signed/runtime acceptance.
- Added strict actual-Hermes size gate to --distribution binary verification: decimal4,000,000bytes
  (T15 MB, not a looser MiB cap), magic/header/regular-file checks, exact-cap/one-byte-over/invalid-artifact
  regressions. Verifier tests pass; current actual7,248,824byte export correctly FAILS.
- Sentry crash-only review: numeric tracesSampleRate0 still enables SDK tracing integration selection.
  Removed both tracing keys while retaining native/default error integrations and scrubbing. RED/GREEN
  tests/typecheck pass; universal ledger3cb78ad. Public named imports now retain lazy capture via local
  binding (be86ec6c), with exact forwarding/no-init tests.
- Combined command-only tree-shake+no-replay export6,253,900bytes; named-import follow-up6,175,296bytes,
  actual2890-source graph excludes dev. Still FAILS4MB; experimental flags remain uncommitted/unenabled.
  Lockfile audit found eight separate sameversion Sentry core10.37 copies beside servercore10.69;
  investigating supported dependency deduplication without SDK version overrides or product removal.

- Continuation reviewed uncommitted root-core experiment at experiment/sentry-root-core, based on0af7b308.
  Exact root production core10.37 collapses mobile copies8→1; all other package versions unchanged,
  server origins preserve exact10.69 nested. Clean install and workspace typechecks passed. Synthetic
  no-experimental-flags HBC6,357,304bytes; command-only optimized HBC5,947,932bytes. Both FAIL strict
  decimal4,000,000 budget; no-dev verifier passes. Root requested app-next-specific full tests (root
  test:app only covers legacy app), topology regression and ADR before adopting. Existing E2E YAML
  contract failure remains reported, not suppressed. Further read-only HBC attribution underway.

- Adopted reviewed core topology as3a17550a; root follow-up0c6b2865 includes @sentry-internal owners
  in regression traversal and accepts ADR0020. Clean integrated npm ci passed; all5 topology/Metro/size
  node tests pass. Candidate app-next full suite241/1160/13 snapshots passed (not legacy app tests).
  No experimental optimizer flags adopted. Remaining app-source audit found no large fixture/test or
  duplicate workspace pollution, and React Compiler is genuinely active. Supported auth-only Supabase
  client equivalence research assigned before any architecture change. Budget remains FAIL.
- Browser creation works again, but Apple Developer actually redirects to an empty Sign In form; no
  authenticated portal session is available. Preserved signing portal tab for login handoff, entered no
  credentials. Claiming existing PostHog tab still times out. No permissions, keys or profiles changed.

- Fresh browser read disproves guessed PostHog project:451896 is Recovi in Edge, NOT ExcerLock.
  Organization menu lists a separate ExcerLock organization; switching/navigation detached before
  its project ID could be verified. Do not configure deletion against451896. No key creation occurred.
- Fresh local audit identified missing current T14 real-runtime acceptance, T15 first-frame/TTI
  instrumentation, and potentially stale T13 security advisories; targeted source/audit revalidation
  assigned rather than accepting old evidence or deleting legacy dependencies speculatively.
- Auth-only bundle research exposed an independent lifecycle risk: SDK dispose cancels timers but
  does not drain in-flight refresh/storage operations. Existing service dispose does not invoke SDK
  cleanup. Root is reviewing a public lock/drain solution before implementation; foreground-only
  refresh proposal rejected as insufficient to preserve long-active refresh behavior.
