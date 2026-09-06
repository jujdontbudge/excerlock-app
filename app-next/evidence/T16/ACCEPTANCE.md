# Phase 1 acceptance — ExcerLock

Implementation is complete through T16 on `rebuild/phase-1`, from snapshot `91c1d9ee83eb832526165685ea5536ca823f9821`. Phase 2 has not started. This is a local functional and visual self-review handoff, **not independent visual sign-off**: Johan deferred Gemini/human checkpoints with “continue with what you have till the end.” No missing Gemini grade is represented as PASS.

## Acceptance checklist

| # | Result and evidence |
| --- | --- |
| 1 | **PASS.** Owned simulator erased; fresh Expo development client built (0 errors, 2 upstream warnings), installed and cold-launched L0 → O01. [Build](build.log), [boot](boot.log), [cold launch](cold-launch.log), [movie](cold-L0-O01.mp4), [O01](cold-O01.png). First-run Expo host controls are separately preserved in `first-run-host-setup.mp4`. |
| 2 | **PASS.** All eight complete fresh onboarding journeys reach Home with the intended rule and **Mon–Fri · 9 AM–9 PM**. [Run log](branches.log); branch movies and summary/Home snapshots linked below. |
| 3 | **PASS.** Walking-goal journey kills at W3, cold-resumes W3 with `5000 steps`, then verifies retained W2 goal and W1 Outside selections. Entered name `Alex` survives through Home. [W3](W3-cold-resume.png), [W2](W2-resumed-selection.png), [W1](W1-resumed-selection.png), [full journey](walking-goal-complete.mp4). Driver corrections are disclosed in [README](README.md). |
| 4 | **PASS.** Hard gate blocks direct Home navigation; expired and billing-issue states, not-found restore, purchase error and successful restore exercised. [Edges](edges-completed.md), [movie](edge-acceptance.mp4), [T15 plan/session movie](../T15/sheets-and-paywall.mp4). |
| 5 | **PASS.** Fake Screen Time, Motion, Health, while-in-use Location and Notifications grant/deny; empty apps skip; five-gym cap. [Permission log](permissions.log), [movie](permission-choices.mp4), [gym cap](five-gym-limit.png), [gym continuation](gyms-and-delete-final.mp4). Always Location deny/grant and email wrong-code/resend/correct-code are in [T15 setup log](../T15/setup.log) and [movie](../T15/setup.mp4). Camera is an inspectable fake status, not an invented setup request. |
| 6 | **PASS.** Ten Home states, live locked→unlocked, full walking session and gym inside/outside exercised in [Home movie](../T15/home.mp4), [session log](../T15/sheets-and-paywall.log), [session movie](../T15/sheets-and-paywall.mp4). [01:00 locked](overnight-0100-locked.png). Final live [step unlock](steps-home.png) and [gym unlock](gym-minutes-home.png) share Analytics facts. Overnight gym window ownership has [red](overnight-gym-red.log)/[green](overnight-gym-green.log) integration evidence, including resolver state. |
| 7 | **PASS.** Create, edit, discard, pause and overlap in [Conditions movie](../T15/conditions.mp4); confirmed deletion through empty in [deletion movie](delete-final.mp4), [overlap](overlap-list.png), [empty](delete-to-empty.png). |
| 8 | **PASS.** Week/Month/Year across 6-weeks, day-zero and no-measurement scenarios replayed on final source: [log](analytics.log), [movie](analytics.mp4). Today's [step recap](steps-recap.png) and [gym recap](gym-minutes-recap.png) verified against fake signals in [live data log](live-data.log) and [movie](live-analytics-and-picker.mp4). |
| 9 | **PASS.** Every Settings row, support, legal, permission details, gyms, seven-tap dev entry and deletion preserving rules in [Settings movie](../T15/settings.mp4), [log](../T15/settings.log). Final units/grace/switches/share/rate/manage/restore in [edges](edges-completed.md), [units on Home](units-propagate.png), [adjacent rating feedback](rate-near-row.png). Actual Switch values and auto-detect grant/deny/disable are verified in [preferences](preferences-final.log) and [movie](preferences-final.mp4). |
| 10 | **LOCAL CHECKS PASS; INDEPENDENT GATE DEFERRED.** [T14 accessibility](../T14/README.md), [XL review](../T14/xl-review.md), [Reduced Motion](../T14/motion-notes.md); [T15 self-review](../T15/self-review.md), [performance limits](../T15/perf.md), [micro movie](../T15/micro-interactions.mp4). The [T15 index](../T15/README.md) and its nine `*-gemini.md` files explicitly record DEFERRED, not PASS. No measured GPU frame rate, physical haptic quality or spoken VoiceOver result is claimed. |
| 11 | **PASS.** Typecheck, tests, lint, Doctor, dependency compatibility and iOS export. Exact summaries below; full logs linked. |
| 12 | **PASS against required snapshot, with inherited main exception.** [Hygiene](hygiene.json): no edits to `app/`, `server/`, `packages/`, `excer-ui-mock/` from snapshot. All 354 protected-file differences from main already exist in that snapshot; the literal main-diff-empty clause cannot hold without undoing the authorized base. Design edits confined to motion references and permitted replay provenance/segment metadata. Final commit/status recorded in [final repository log](final-repo.log). |
| 13 | **PASS.** [App README](../../README.md) current; every source folder has a README; no TypeScript source file exceeds 220 lines. [Hygiene](hygiene.json). |
| 14 | **Owned simulator shut down at completion.** [Cleanup](cleanup.log). An unrelated Recovi simulator and Simulator.app belonged to another active session, so targeted shutdown preserves that work instead of running `shutdown all`. This task did not open Simulator.app. |

## Complete onboarding journeys

- **walking-goal:** [movie](walking-goal-complete.mp4), [summary](walking-goal-summary.png), [Home](walking-goal-home.png).
- **walking-state:** [movie](walking-state-complete.mp4), [summary](walking-state-summary.png), [Home](walking-state-home.png).
- **gym-arrival:** [movie](gym-arrival-complete.mp4), [summary](gym-arrival-summary.png), [Home](gym-arrival-home.png).
- **gym-time:** [movie](gym-time-complete.mp4), [summary](gym-time-summary.png), [Home](gym-time-home.png).
- **running-time:** [movie](running-time-complete.mp4), [summary](running-time-summary.png), [Home](running-time-home.png).
- **running-distance:** [movie](running-distance-complete.mp4), [summary](running-distance-summary.png), [Home](running-distance-home.png).
- **biking-time:** [movie](biking-time-complete.mp4), [summary](biking-time-summary.png), [Home](biking-time-home.png).
- **biking-distance:** [movie](biking-distance-complete.mp4), [summary](biking-distance-summary.png), [Home](biking-distance-home.png).

## Final verification

[Coverage log](coverage.log):

```text
Test Suites: 113 passed, 113 total
Tests:       419 passed, 419 total
Snapshots:   14 passed, 14 total
All source: statements 84.95%; branches 82.74%; functions 81.46%; lines 86.17%
Domain: statements 99.5%; branches 100%; functions 98.41%; lines 99.36%
```

[Typecheck](typecheck.log), [lint](lint.log), [Doctor](doctor.log), [dependencies](dependencies.log), [export](export.log), [script tests](script-tests.log):

```text
> tsc --noEmit                         # exit 0
> expo lint                           # exit 0
21/21 checks passed. No issues detected!
Dependencies are up to date
Exported: dist                        # iOS Hermes bundle, 4.3 MB
CLI script tests: 2 passed
```

Acceptance fixes were test-first: [current-day data red](integrity-red.log)/[green](integrity-green.log), [recap rounding red](recap-rounding-red.log)/[green](recap-rounding-green.log), and overnight gym red/green above. Current-day steps, workouts and usage agree across fake ports and Analytics; prior days remain historical. Gym elapsed time credits the active overnight rule window while Analytics uses the calendar day. Six local search candidates exercise a five-place cap at a fixed 100 m radius. Sheet intrinsic height changes animate. The searchable gym picker holds a stable expanded height: its heading moved 192 points in the [native red test](picker-stability-red.log), and stays at y=142 before/after filtering in the [green test](picker-stability-green.log) and [final movie](picker-stability-green.mp4). The [accessibility-large repeat](picker-stability-xl.log) also holds its heading at y=134. Long gym addresses stack below their names, with [red](gym-row-red.log)/[green](gym-row-green.log) evidence and final native inspection.

Generated movies, snapshots, trees and logs remain on this workstation under `app-next/evidence/`; markdown indexes are committed. These links therefore work in this checkout but generated evidence is not in a fresh clone. Capture-driver retries are retained and explained in the README. No network services, real permission requests, authentication, purchases or native enforcement were introduced.

## Remaining acceptance

Johan's visual review and the independent Gemini motion grades remain deferred. T00 reference-study limitations remain documented in [reference status](../../../design/motion/reference/STATUS.md) and [quality notes](../../../design/motion/reference/QUALITY-NOTES.md). Local recordings/self-review establish what was exercised; they do not certify equivalence to OtterLife or satisfy the missing independent gate. Phase 2 awaits explicit authorization.
