# TestFlight 1.0.0 (7) — 2026-09-18

Walking-gate candidate (ADR 0041: shake no longer unlocks, a still phone relocks)
built locally from branch `fm/tf-walk-fix-t7` (a fast-forward of `main` at
`842edc32`) with `ios.buildNumber = "7"`:

- `209775cf` fix(detection): raw stream corroborates Apple's walking legs and confirms stops (ADR 0041).
- `842edc32` test(e2e-next): E2E-F1/H1/F2 pass on 209775cf (run 20260919T032354Z) (harness only; not in the IPA's behaviour).
- `4b149c1f` chore(ios): build number 7.

JS-only delta against build 6 (no native, dependency or config change; runtime stays `2`).

## What changed for the tester

- Shaking the phone while seated no longer unlocks: Apple's activity and cadence
  legs only count while the raw accelerometer window looks like gait.
- Putting the phone still relocks about 10 s after the stillness began, from
  active relief or grace, instead of running out a minute-long grace.
- Resuming after a short stop re-verifies for 3 s (instant through the raw path)
  before relief returns; a pocket walk still unlocks.

## Proof before upload

- ADR 0041 replay over every recorder capture: second-level accuracy 93.5 % → 96.3 %,
  false relief 23 s → 14 s, missed walking 72 s → 40 s (`docs/adr/0041-…md`).
- `842edc32`: E2E-F1/H1/F2 PASS on the pinned `ExcerLock-Next` simulator against a
  release-style build of `209775cf` (run `20260919T032354Z`).
- On this tree before archiving: `npm run typecheck` clean; `jest src/runtime/detection
  src/domain/walkingMachine` 18 suites / 298 tests pass; `verify-binary.sh --prebuild-only ios` PASS.

## Apple artifact

- App `6787265352`, bundle `com.johansardar.excerlock`, team `AX3C2B78YD`.
- Build ID `dfb093eb-2b5c-49bc-bd42-4d0881f8b15d`, `1.0.0 (7)`, uploaded
  2026-09-18 20:42 PT, processing `VALID`, audience `APP_STORE_ELIGIBLE`,
  `usesNonExemptEncryption: false`. Not submitted for beta or App Review.
- Tester johansardar@icloud.com (tester `5e83c452-5ef3-46c9-af67-ea59e50c22d5`,
  groups Internal + Captain) explicitly attached to the build
  (`asc testflight testers add-builds`) and auto-notify enabled
  (`asc testflight notifications send`).
- What to Test (en-US, localization `d5c6f1b1-5e35-4af3-af5e-7a1e2f620e8e`): the
  shake / walk-then-stop / red-light / pocket-walk protocol in
  `app-next/build/tf/what-to-test-7.txt` (untracked).
- IPA SHA-256 `dc2103a56e21e053c7a304b55f4c535db84dc48a50a2ca4b7b7be1a94abaa6fb`
  (`app-next/build/tf/ExcerLock-1.0.0-7.ipa`, untracked). Embedded `Expo.plist`:
  runtime `2`, channel `production`. `verify-binary.sh --distribution` passed for the
  main bundle and all four extensions; the Hermes `main.jsbundle` string table carries
  `stillStopMs`/`stillSince`/`gaitShaped`; the signed `Info.plist` carries `CFBundleVersion 7`.

## Lane

Same as `2026-09-18-testflight-1.0.0-6.md` (build number in `app.json` before the
single `prebuild --clean`, restore `ios/.xcode.env.local`, `asc xcode archive` with the
ASC auth key flags and `CURRENT_PROJECT_VERSION=7`, `asc xcode export` under the
Homebrew-free `PATH` reusing the build-5 ExportOptions plist, upload under
`scripts/agent-ops.py run` via `build/tf/upload-7.sh`).
