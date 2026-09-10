# Ship acceptance status — 2026-09-10

**Not submission-ready.**

Current user-authorized endpoint: submission-ready only; TestFlight is allowed. App Review submission,
public release, and production OTA publication are prohibited. Historical public-store/OTA execution
requirements remain in the original plans for reference but are not completion gates for this revised goal. This index distinguishes current `plans/ship/` gates from older rebuild evidence.
Existing `T13`, `T14`, `T15` and `T16` folders include historical task numbering, fake-runtime previews,
and Debug recordings. Their filenames and passing tests do not certify the corresponding Ship tasks.
Preserve those artifacts as historical evidence; never substitute them for current release acceptance.

## Latest sprint checkpoint — 21:01 UTC

At source879e95a4:250/250 app suites,1210/1210 tests,13/13 snapshots and typecheck PASS. Actual candidate27a6bcdf verifies reviewer20/all-day flow, published legal documents, Google provider sign-in launch (not completed auth), and annual/monthly live paywall. Later Apple-branding/duplicate-paywall fixes require final native artifact inspection.

## Current verified local checkpoints

| Evidence | What it proves | What it does not prove |
| --- | --- | --- |
| App candidate217647f1:248 suites,1189 tests,13 snapshots and typecheck pass (`/tmp/ship-geofence-{full-tests,typecheck}.log`) | Covered local behavior including auth lifecycle drain; clean install with required postinstall | Real sensors, signed execution, device purchase/auth/shields, release UI |
| Server c26bac8f:36files/192tests; typecheck/build/Drizzle check (`/tmp/ship-server-bridge-integrated.log`) | Fresh and exact legacy migration compatibility, journal preservation/replay, readiness schema checks | Applied remote migration or live provider erasure |
| Distribution verifier:9Python tests and shell syntax | Verifier predicates tested | Existence of a verified signed IPA |
| Real-graph synthetic production export at a4c738bc | Production JS dependency graph includes real runtime and excludes dev graph | Hermes size, signed/native runtime, current later edits |

## External gates still open

- **T00/T01:** Team-level Family Controls approval and identifier capabilities evidenced for all five IDs.
  Five App Store profiles were created under release lock, but report profile735XMH25VL has an empty App
  Groups entitlement. The intended group relationship must be assigned and that profile regenerated.
  `asc web` lacks an authenticated session; CUA pipe fails and a normal Chrome Developer Portal visit redirects to Sign In. First four profiles passed checks. Regenerating the report profile before fixing the association again produced an empty App Group entitlement, not a repair.
- **T04/T06:** Production PostHog erasure personal key/project configuration absent. A fresh six-vendor probe passes; anonymous/Apple/Google/email providers are enabled, but live POST /v1/subscription/resync still404. No live deletion
  acceptance or device identity-spine proof. A schema-ready database alone does not prove erasure ready.
- **T13:** Two target subscription review screenshots (A annual/monthly) now have verified COMPLETE delivery. Four target product screenshots and overall metadata readiness remain open. App Store version has
  no build attached. Narrow product-backed ASC metadata updates passed readbacks under release lock;
  validation now has4 blockers: review details, attached build, availability, screenshots. Existing review notes are a draft. Privacy label
  publication and complete release screenshots are unverified. Reviewer preset is implemented: exact trimmed App Review name or bounded review_preset flag sets20steps and today-only/all-day weekly schedule. Real candidate27a6bcdf journey and restart proved the visible/persisted20step plan. No purchase/sensor/auth bypass exists.
  Do not tick checklist lines from this index.
- **T14:** Physical iPhone13 Il is unavailable. Session-owned simulator EA6C9AC3-0C1A-430B-8EF9-A84A6E044206
  has verified real-runtime Release candidate986f738a (final accessibility-handler refresh is building). Correct simulator ad-hoc signing and a verified
  geofence stop fix resolve the two observed startup failures. Walking onboarding reaches fetched
  paywall; plan switching and restore-not-found observed. AX/screens in candidate-217647f1 folder.
  No real/local StoreKit purchase completed; no physical sensor/lock-state acceptance. The six-product .storekit catalog and opt-in Debug test scheme now exist and build-for-testing passes. First UI-test run exposed harness-only runner catalog/Expo dev-menu problems; bounded recovery is in progress, not purchase acceptance.
- **T15:** Release startup/TTI and battery/device measurements absent. Home semantic-clock optimization
  passed local tests. Unsigned device Release at7619c5bd compiled, but its packaged Hermes bundle was
  7,881,912 bytes: FAIL against the strict decimal4,000,000-byte gate. A disposable single-core Sentry
  dependency experiment measured6,357,304 bytes without experimental optimization and5,947,932 bytes
  with command-only tree shaking. Both still FAIL; neither synthetic export proves native runtime acceptance.
  Actual packaged Release simulator candidate217647f1 has6,372,948-byte Hermes bundle (SHA256 in
  `ship-current-simulator/candidate-217647f1/build.json`), also FAIL against4,000,000. RuntimeVersion2/main+4 extensions built;
  that older artifact lacks the local OTA channel. Source970d59aa now derives channels from the build environment;4 real-loader smoke checks/typecheck pass. An empty preview channel/branch was created under lock (zero update groups), returning204. Candidate27a6bcdf native artifact confirms preview channel/runtime2 and canonical privacy parity. Its6,378,440-byte Hermes bundle still FAILS4,000,000. Device OTA activation remains unverified; no OTA published.
- **T16 (revised scope):** No uploaded candidate or verified TestFlight install yet. Stop at verified
  submission readiness; do not execute App Review submission, public release, or production OTA.
  Device correctness and TestFlight checks are still open, not replaced by server/test evidence.

## Source and ownership

Current integration lives at `/Users/johansardar/ExcerLock-build/ship`; original repository metadata was
moved intact to `ExcerLock-backup-20260910-104501`. The newly initialized original directory is not this
source and must not be overwritten. Build checkout `release-7619c5bd` is clean/detached and claimed.
All release mutations require the whole applicable sequence under `scripts/agent-ops.py run`.
See `plans/ship/PROGRESS.md` for newer checkpoints; do not treat this dated index as live activation proof.
