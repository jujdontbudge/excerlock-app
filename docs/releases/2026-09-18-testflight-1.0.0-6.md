# TestFlight 1.0.0 (6) — 2026-09-18

Home Report candidate built locally from branch `fm/home-report-h1` (a
fast-forward of `main` at `b0953561`) with `ios.buildNumber = "6"`:

- `ebc32d3e` feat(home): Report in two taps plus hold-down ground-truth chips.
- `69189473` fix(home): store selector must be a use-hook for the React Compiler; guardrail + E2E-H1.
- `80295abd` test(e2e-next): E2E-H1 passes on run 20260919T022047Z (harness only; not in the IPA's behaviour).
- `39806c4d` chore(ios): build number 6.

## What changed for the tester

Home now carries the bug report itself; nothing in Settings needs opening:

- Four hold-down chips under the lock: **Walking · Sitting · Shaking · Treadmill**.
  Hold one (about half a second) — it is the ground truth for what you are doing
  right now and goes out with the next report. One chip is active at a time; a
  plain tap answers "Hold, do not tap" instead of doing nothing. A held label
  goes stale after ten minutes.
- **Report** (one orange button) opens a sheet with three reasons, the likely one
  preselected from the lock state (locked → "Still locked", unlocked → "Unlocked
  by mistake", otherwise "Something else"), one line saying exactly what goes out,
  and **Send report**. Two taps: Report, Send. "Thank you" then Done.
- What reaches us: the words (`<reason> while walking`), the same diagnostic
  snapshot as the Settings report, plus `activityTruth` (the held chip and how
  long before Send it was held). Never location, app names or email.

## Proof before upload (standing rule: simulate the user on the real screen)

`E2E-H1` (`app-next/e2e-next/scenarios/h1_home_report.py`) ran on the pinned
`ExcerLock-Next` simulator against a release-style preview build of `80295abd`,
on the E2E-F1 existing-user fixture, run `20260919T022047Z`: chips and Report on
Home without opening anything → hold Walking → Report → the sheet's line names
"Walking" → Send → "Thank you" → the newest `incident_reports` row on
`api.excerlock.com` (read over the deploy SSH path) holds
`Something else while walking` with `diagnostics.activityTruth.activity = walking`.
All seven assertions PASS; F1 mint and F2 teardown PASS around it. Evidence under
`app-next/e2e-next/out/20260919T022047Z/`.

The loop earned its keep: the first release-style run (`20260919T020916Z`) died
on the first chip tap while all 1650 Jest tests were green — a bare
`activityTruthStore((s) => …)` call is invisible to the React Compiler as a hook
("Should have a queue"). Fixed by the `use` alias and the new
`storeHookNaming` guardrail (`app-next/src/state/__tests__/`), which fails on any
bare store call in a component so this cannot ship again. Unit: 5 new Home
Report tests, 2 store tests, 1 diagnostics test, 1 registry test
(`activity_truth_held`, `incident_report_sent`).

## Apple artifact

- App `6787265352`, bundle `com.johansardar.excerlock`, team `AX3C2B78YD`.
- Build ID `0f1aee14-2f94-4ad4-8fa5-54524bbe45b7`, `1.0.0 (6)`, uploaded
  2026-09-18 19:29 PT, processing `VALID`, audience `APP_STORE_ELIGIBLE`,
  `usesNonExemptEncryption: false`. Upload-only: not added to any beta group,
  nothing submitted for beta or App Review.
- What to Test (en-US, localization `77131052-4e5d-4dc1-98bb-280895c48bac`): the
  hold → Report → Send walk-through under "What changed for the tester" plus
  airplane-mode Send.
- IPA SHA-256 `cf2b92ad500009c28ce2c27d1c127433da87615bd6915895381a806c68bd8269`
  (`app-next/build/tf/ExcerLock-1.0.0-6.ipa`, untracked). Embedded `Expo.plist`:
  runtime `2`. `verify-binary.sh --distribution` passed for the main bundle and
  all four extensions; `main.jsbundle` contains the chip caption, "Report a
  problem", "Unlocked by mistake" and the `activityTruth` snapshot key; the
  signed `Info.plist` carries `CFBundleVersion 6`.

## Lane

Same as `2026-09-18-testflight-1.0.0-5.md` (build number in `app.json` before
the single `prebuild --clean`, `asc xcode archive` with the ASC auth key flags,
`asc xcode export` under the Homebrew-free `PATH`, upload under
`scripts/agent-ops.py run`).
