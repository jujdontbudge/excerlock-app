# TestFlight 1.0.0 (5) — 2026-09-18

Incident-Send candidate built locally from branch `fm/incident-send-s1` (a
fast-forward of `main`; the IPA was built from the tree at `3edeb4a2` on top of
`be559e46`, later rebased unchanged onto `4b66483d`) with `ios.buildNumber = "5"`:

- `6070b10d` (was `b063a580`) fix(incident): Send always answers a tap on Something not working?
- `3e8872e2` (was `46f92e8c`) chore(ios): build number 5.
- `20b421ef` (was `3edeb4a2`) test(e2e-next): E2E-R1 drives the real Report screen (harness only; not in the IPA's behaviour).

## What changed for the tester

Settings → "Something not working?": Send used to be greyed out until both
answers had text, so a tap did nothing. Now Send is always live (except while
sending):

- Tap with both answers empty → "Answer both questions, then tap Send." under the form.
- One answer → the message names the missing one.
- Both answers → "Sending…" then the "Thank you" screen. If the API refuses or
  the network is down, the friendly error **and the reason** show under the form
  and both answers stay for a retry.

## Proof before upload (standing rule: simulate the user on the real screen)

`E2E-R1` (`app-next/e2e-next/scenarios/r1_incident_report.py`) ran on the
pinned `ExcerLock-Next` simulator against a release-style preview build of this
tree, on the E2E-F1 existing-user fixture, run `20260918T2059Z`: Send enabled while empty,
empty press → message, one answer → message naming the other, both answers →
real `POST /v1/incident-reports` accepted → "Thank you". All seven assertions
PASS; F1 mint and F2 teardown PASS around it. Evidence under
`app-next/e2e-next/out/20260918T2059Z/`. Unit regression tests
(`incident.test.tsx`) fail on the old disabled Send and pass now.

## Apple artifact

- App `6787265352`, bundle `com.johansardar.excerlock`, team `AX3C2B78YD`.
- Build ID `3ec32b84-5b2e-4188-92eb-7788bdc1578b`, `1.0.0 (5)`, uploaded
  2026-09-18 14:17 PT, processing `VALID`, audience `APP_STORE_ELIGIBLE`,
  `usesNonExemptEncryption: false`. Upload-only: not added to any beta group,
  nothing submitted for beta or App Review.
- What to Test (en-US, localization `ec5e9c09-a823-4953-aa95-3e9af1545591`): the
  four taps under "What changed for the tester" plus airplane-mode Send.
- IPA SHA-256 `13e13485acdba7d2ce658c60fd7e9c84acab5f0aba5ea009c027f9bc9134465f`
  (`app-next/build/tf/ExcerLock-1.0.0-5.ipa`, untracked). Embedded `Expo.plist`:
  runtime `2`. `verify-binary.sh --distribution` passed for the main bundle and
  all four extensions; `main.jsbundle` contains both new Send messages; the
  signed `Info.plist` carries `CFBundleVersion 5`.

## Lane

Same as `2026-09-18-testflight-1.0.0-4.md` (build number in `app.json` before
the single `prebuild --clean`, `asc xcode archive` with the ASC auth key flags,
`asc xcode export` under the Homebrew-free `PATH`, upload under
`scripts/agent-ops.py run`).
