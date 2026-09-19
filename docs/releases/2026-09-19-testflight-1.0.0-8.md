# TestFlight 1.0.0 (8) — 2026-09-19

First App Store candidate (ADR 0042: the OTA-ready native sensor surface and a
JS-callable review sheet) built locally from branch `fm/native-ota-surface-n1`
(a fast-forward of `main` at `9be23dc7`; the archive was cut before the rebase onto `9be23dc7`, whose only delta is `app-store-screenshots/`, so the app tree — harness fingerprint `07feadef6f06` — is the one in the IPA; pre-rebase hashes `cf373c7c`/`9e72060e` appear in the committed verdicts) with `ios.buildNumber = "8"`:

- `0269d99e` feat(motion): collect-only Core Motion streams behind honest availability flags; runtimeVersion 3.
- `67529040` feat(location): LocationSample carries GPS speed and course from the existing paths.
- `8f9001d4` feat(runtime): JS-callable StoreKit review sheet, sensor stream catalogue, flags-only sensors snapshot in incident diagnostics.
- `295a691e` test(e2e-next): E2E-M1 drives the preview-only /diagnostics/sensors smoke (harness + a route closed in prod; not in the IPA's behaviour).
- `14e502cc` docs(adr): 0042.
- `aaeecfda` chore(ios): build number 8.
- `9ff8fd30` fix(e2e-next): idb ui text takes the chunk after `--` (harness only).
- `78a3af5c` test(e2e-next): E2E-F1/H1/M1/F2 pass on aaeecfda (run `20260919T054020Z`).

Native delta against build 7: `modules/excerlock-motion` grew (new AsyncFunctions,
events and payload fields), so `runtimeVersion` moves `2` → `3`. No new dependency,
entitlement or usage description; `expo-store-review` was already linked. Per the
captain (2026-09-19): build 7 does not go to the store; this binary is the first App
Store submission once the firstmate submits it — **not submitted for review here**.

## What changed for the tester

Nothing visible. The walking gate, unlocks and relocks are build 7's (ADR 0041).
Under the hood the binary can now collect device-motion attitude/quaternion/heading/
magnetic field, pedometer distance/pace/floors and pause/resume events, relative
altitude, raw magnetometer, GPS speed/course, and can raise Apple's rating sheet —
all from JS, none of it called by this build's bundle. Watch for a permission sheet
that build 7 never showed, a launch crash or a stuck "Starting ExcerLock…".

## Proof before upload

- `78a3af5c`: E2E-F1/H1/M1/F2 PASS on the pinned `ExcerLock-Next` simulator
  against a release-style build of `aaeecfda` (run `20260919T054020Z`): the fixture mints,
  Home and the Home Report flow still land their row with the new runtime graph, and
  E2E-M1 proves every new bridge function exists in the release bundle, rejects with
  `ERR_MOTION_UNAVAILABLE` on the motion-less simulator (never faked, never prompting),
  stops idempotently and repeats.
- On `aaeecfda` before archiving: `npm run typecheck` clean (all workspaces);
  `npm run lint --workspace app-next` 0 errors; `npm run test:guardrails` PASS;
  `node --test app-next/scripts/*.test.cjs` PASS (config smoke pins runtime `3`);
  `npm run test --workspace app-next` 296 suites / 1704 tests pass;
  `verify-binary.sh --prebuild-only ios` PASS.

## Apple artifact

- App `6787265352`, bundle `com.johansardar.excerlock`, team `AX3C2B78YD`.
- Build ID `0b6b5feb-a77e-4f63-835c-daf9576a727c`, `1.0.0 (8)`, uploaded 2026-09-18 23:50 PT (2026-09-19 06:50 UTC), processing
  `VALID`, audience `APP_STORE_ELIGIBLE`, `usesNonExemptEncryption: false`.
  Not submitted for beta or App Review.
- Tester johansardar@icloud.com (tester `5e83c452-5ef3-46c9-af67-ea59e50c22d5`)
  **not attached here** and no notification sent: per the firstmate's 002 instruction the firstmate attaches the build and submits.
- What to Test (en-US, localization `c3bb451b-bf21-4bb4-a1d3-65b6bfe95c2c`): `app-next/build/tf/what-to-test-8.txt` (untracked).
- IPA SHA-256 `b8b56ab8243c9957d991794e8fcd0d47f7f7468d2f56e6c63cd631c05b89906e` (`app-next/build/tf/ExcerLock-1.0.0-8.ipa`, untracked).
  Embedded `Expo.plist`: runtime `3`, channel `production`. `verify-binary.sh
  --distribution` passed for the main bundle and all four extensions; the signed `Info.plist` carries `CFBundleVersion 8`;
  the main binary carries the new `ExcerlockMotion` symbols (`startAltimeter`,
  `startMagnetometer`, `startPedometerEvents`, `recordAccelerometer`) and `ExpoStoreReview`.

## Lane

Same as `2026-09-18-testflight-1.0.0-7.md` (build number in `app.json` before the
single `prebuild --clean`, restore `ios/.xcode.env.local`, `asc xcode archive` with the
ASC auth key flags and `CURRENT_PROJECT_VERSION=8`, `asc xcode export` under the
Homebrew-free `PATH` reusing the build-5 ExportOptions plist, upload under
`scripts/agent-ops.py run` via `build/tf/upload-8.sh`).
