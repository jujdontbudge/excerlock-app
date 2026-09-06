# T16 — Phase 1 acceptance run

A single session that proves Phase 1 is done, producing `app-next/evidence/T16/ACCEPTANCE.md` for Johan.

## Checklist (Codex fills every line with evidence links)

1. Clean simulator (`xcrun simctl erase <udid>`), fresh dev-client build, cold launch: L0 → O01.
2. Full onboarding, each branch once, from the four branch scenarios' `fresh` variants: walking (step goal),
   walking (while walking → skips W3), gym (arrival → skips G2), gym (time), running (time), running
   (distance), biking (time), biking (distance). Each ends on Home with the right rule and schedule label.
3. Resume: kill the app at W3, relaunch → W3 with the name and answers intact.
4. Paywall: hard gate verified; expired and billing-issue re-entry; restore path.
5. Setup: grant and deny for every permission; no-apps skip; gym picker max 5; email code error/resend.
6. Home: all ten states from scenarios; live `locked → unlockedMet` via dev clock + fake steps; walking
   session full script; gym check-in inside/outside; cross-midnight window at 01:00 shows `locked`.
7. Conditions: create, edit, pause, delete; overlap scenario; empty state.
8. Analytics: three periods × three scenarios; recap card on Week.
9. Settings: every row; units change propagates; delete account keeps rules; dev menu via 7 taps.
10. Accessibility: T14 evidence linked. Motion: T15 PASS files linked.
11. Checks: `typecheck`, `test` (with coverage numbers), `lint`, `expo-doctor`, `expo install --check`,
    `expo export` outputs pasted.
12. Repo hygiene: `git status` clean on `rebuild/phase-1`; `app/`, `server/`, `packages/`, `excer-ui-mock/`
    untouched (`git diff --stat main -- app server packages excer-ui-mock` empty); `design/` changes limited to
    `design/motion/`, replay downloads with FOUNDRY files, and icon FOUNDRY entries.
13. `app-next/README.md` current; every `src/**` folder has a README.
14. Simulator shut down (`xcrun simctl shutdown all`).

Johan's part: open the app, run through onboarding and the four tabs from the dev menu scenarios, and reply
"good" or a list. Phase 2 does not start before that.
