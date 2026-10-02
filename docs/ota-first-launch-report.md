# Build 18: first-install onboarding OTA verification

All 44 local Release case names have a passing latest result. The final implementation is `bfab1d3d`; three focused development proofs also passed, and `./excer check` passed all 21 checks.

The table retains the latest result per case after the cover-handoff baseline `ad9dbe46` at `2026-10-02_21-48-00`. The 44-case matrix was followed by 13 focused reruns on `bfab1d3d`, covering native recovery, force-quit resume, startup timing, transition safety and returning installs. Unchanged behavior retains its matrix evidence. Earlier failed and blocked recordings remain available; they are not relabeled as passes. The exact source hashes and final binary are recorded in [focused-source.json](../.excer/ota-lab/focused-source.json).

## Changes and local commits

| Commit | File area and behavior |
|---|---|
| `9857355e` | Updates, onboarding, launch and flow invariant: native startup observation, bounded first-open hold, one catch-up grant, safe page-boundary handoff and prerequisite resume. |
| `4a2b064b` | Paywall and analytics: one mounted impression, persistent first-view observation, running update ID and embedded status. |
| `9fe10b0e` | Local Release simulator lab, update protocol server, fixtures and focused dev proofs. |
| `3b2ef104` | Lab driving: wait for Paywall plans and detect Welcome’s Sign in sheet. |
| `ecdb3e9c` | Native overlay and registered React root: retain the native splash, decode before teardown, wait for destination layout and maintain the app’s key window. |
| `b7fc1aeb` | Video review: fail uniform pale frames, retain contact sheets and measure native overlay dismissal. |
| `ad9dbe46` | Prepare destination layout earlier within the launch budget; keep the old page visible until the native overlay appears. |
| `d6086f37` | Restore native early-error recovery after an explicit onboarding reload; prevent old monitor timers from removing new handlers. Fix stale crash frames and preserve selected answers when the lab exercises Back. |
| `bfab1d3d` | Reserve three emphasized motion durations for destination preparation and one standard duration for native handoff within the first-open budget. |

The decision is [ADR 0060](adr/0060-first-install-onboarding-ota-catchup.md). The protocol, version contract and lab instructions are in [docs/ota.md](ota.md).

## Run the lab

Sources: `tools/excer/ota-lab/`, `tools/excer/commands/otaLab.ts`, `app-next/config/otaLab.ts` and `app-next/plugins/withOtaLab.js`. Generated projects, updates and evidence: `.excer/ota-lab/`. Use the assigned hidden worker simulator and keep Simulator.app closed.

```sh
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab prepare
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab native
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab build
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab serve
```

Keep the loopback server in its own terminal. In another terminal:

```sh
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab list
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab run first-held same-o07 added-page
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab review <evidence-dir>
```

Cases run serially with an individual five-minute deadline. The final local Release build [passed with warnings](/Users/johansardar/.bb/plugins/xcode/bundles/run-murjje7s-53805-28.xcresult). The initial matrix used build 26, then the recovery-patched build 27 after `22:01:32 UTC`; the focused reruns used build 28. These are local simulator build artifacts, not App Store build numbers. [final-baseline.json](../.excer/ota-lab/final-baseline.json) and [focused-source.json](../.excer/ota-lab/focused-source.json) record that transition. No EAS operation, upload, App Store build, production mutation or publication was performed.

## Case evidence

Times are milliseconds from the launch request to acknowledged native cover dismissal and from the reload request to native overlay dismissal. Videos establish the visible handoff; timings use the local event trace. The table derives its first-page time from [native-launch-timings.json](../.excer/ota-lab/native-launch-timings.json). Each original `result.json` retains the earlier JavaScript destination-ready measurement; native dismissal followed it by at most 49 ms. Native first-cover dismissal ranged from 2,093 to 8,495 ms, and measured reload covers ranged from 1,234 to 1,905 ms. Native ON_LOAD may start directly on an update, so those launches have no JavaScript reload duration. The local thresholds are 8,500 ms for first open and 2,000 ms for the reload cover; the measured numbers below are the evidence, not a guarantee on another device.

Every evidence directory contains `video.mp4`, per-page screenshots, `labels.json`, `result.json`, `events.jsonl`, `updates-db.json` and `visual-review.json`. Launch and reload contact sheets support reviewing the recording. Uniform pale-frame detection samples at 30 fps and is not a substitute for reviewing other visual artifacts.

| What the tester does | Result | First page ms | Reload cover ms | Predicted → observed destination | Evidence |
|---|---|---:|---:|---|---|
| Install and open while the update arrives before three seconds | PASS | 2877 | — | Welcome (new code) | [video](../.excer/ota-lab/evidence/2026-10-02_22-41-09-first-fast/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-41-09-first-fast/result.json) |
| Install and open while the update arrives between three and eight seconds | PASS | 6889 | 1669 | Welcome → Welcome | [video](../.excer/ota-lab/evidence/2026-10-02_22-41-15-first-held/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-41-15-first-held/result.json) |
| Install and open while the update finishes near the first-open deadline | PASS | 8002 | 1428 | Welcome → Welcome | [video](../.excer/ota-lab/evidence/2026-10-02_22-41-26-first-late/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-41-26-first-late/result.json) |
| Install and open while the download never completes | PASS | 8174 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-41-38-first-never/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-41-38-first-never/result.json) |
| Install and open while the update connection fails | PASS | 2107 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_21-48-56-first-offline/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-48-56-first-offline/result.json) |
| Install and open while the update server returns service unavailable | PASS | 2093 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_21-49-01-first-unavailable/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-49-01-first-unavailable/result.json) |
| Install and open while the download takes fifteen seconds | PASS | 7561 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-41-50-first-slow/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-41-50-first-slow/result.json) |
| Tap Get started on Welcome after a copy update arrives | PASS | 8349 | 1311 | the first Welcome explanation → the first Welcome explanation | [video](../.excer/ota-lab/evidence/2026-10-02_22-08-53-same-o01/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-08-53-same-o01/result.json) |
| Continue from the gender question after a copy update arrives | PASS | 7869 | 1552 | the name question → the name question | [video](../.excer/ota-lab/evidence/2026-10-02_22-10-01-same-o07/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-10-01-same-o07/result.json) |
| Continue from the muscle follow-up after a copy update arrives | PASS | 8230 | 1376 | the fat follow-up → the fat follow-up | [video](../.excer/ota-lab/evidence/2026-10-02_22-11-09-same-o23/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-11-09-same-o23/result.json) |
| Continue from the fat follow-up after a copy update arrives | PASS | 8368 | 1405 | the screen-time estimate → the screen-time estimate | [video](../.excer/ota-lab/evidence/2026-10-02_22-12-17-same-o24/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-12-17-same-o24/result.json) |
| Continue from the Walking Condition choice after a copy update arrives | PASS | 7956 | 1387 | the Walking target → the Walking target | [video](../.excer/ota-lab/evidence/2026-10-02_22-37-43-same-w2/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-37-43-same-w2/result.json) |
| Continue from the Gym Condition choice after a copy update arrives | PASS | 7836 | 1905 | the plan summary → the plan summary | [video](../.excer/ota-lab/evidence/2026-10-02_22-14-33-same-g1/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-14-33-same-g1/result.json) |
| Continue from the Condition demo after a copy update arrives | PASS | 8284 | 1479 | the trial preview → the trial preview | [video](../.excer/ota-lab/evidence/2026-10-02_22-15-40-same-s3b/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-15-40-same-s3b/result.json) |
| Continue from the trial preview after a copy update arrives | PASS | 8416 | 1521 | the reminder → the reminder | [video](../.excer/ota-lab/evidence/2026-10-02_22-16-51-same-s3c/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-16-51-same-s3c/result.json) |
| Continue from the reminder after a copy update arrives | PASS | 7914 | 1608 | the Paywall → the Paywall | [video](../.excer/ota-lab/evidence/2026-10-02_22-18-00-same-s3d/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-18-00-same-s3d/result.json) |
| Continue after a visual update arrives | PASS | 8026 | 1370 | the name question → the name question | [video](../.excer/ota-lab/evidence/2026-10-02_22-19-06-visual/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-19-06-visual/result.json) |
| Finish onboarding after an update adds a page before the current position | PASS | 8053 | 1442 | the Paywall → the Paywall | [video](../.excer/ota-lab/evidence/2026-10-02_22-20-14-added-page/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-20-14-added-page/result.json) |
| Finish onboarding after an update removes the muscle follow-up | PASS | 8442 | 1428 | the Paywall → the Paywall | [video](../.excer/ota-lab/evidence/2026-10-02_22-21-29-removed-follow-up/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-21-29-removed-follow-up/result.json) |
| Finish the Gym route after an update changes that branch | PASS | 8079 | 1568 | the Paywall → the Paywall | [video](../.excer/ota-lab/evidence/2026-10-02_22-22-44-changed-branch/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-22-44-changed-branch/result.json) |
| Finish onboarding after an update renames the name question | PASS | 8199 | 1518 | the Paywall → the Paywall | [video](../.excer/ota-lab/evidence/2026-10-02_22-23-57-renamed-page/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-23-57-renamed-page/result.json) |
| Stay on the Paywall while an update arrives | PASS | 7737 | — | the Paywall (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-25-13-never-p/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-25-13-never-p/result.json) |
| Stay on Setup while an update arrives | PASS | 8266 | — | Screen Time Setup (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-38-50-never-x1/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-38-50-never-x1/result.json) |
| Stay on Sign in while an update arrives | PASS | 8046 | — | Sign in sheet stays open on Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-27-38-never-sign-in/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-27-38-never-sign-in/result.json) |
| Start a purchase while an update arrives | PASS | 8053 | — | the Paywall (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-27-52-never-purchase/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-27-52-never-purchase/result.json) |
| Restore purchases while an update arrives | PASS | 7907 | — | the Paywall (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-28-58-never-restore/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-28-58-never-restore/result.json) |
| Keep the notification permission prompt open while an update arrives | PASS | 8291 | — | the reminder (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-40-03-never-permission/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-40-03-never-permission/result.json) |
| Stay partway through a question while an update arrives | PASS | 7814 | — | the gender question (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-31-09-never-partway/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-31-09-never-partway/result.json) |
| Finish Setup and return to Home while an update arrives | PASS | 8495 | — | Home (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-31-24-never-home/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-31-24-never-home/result.json) |
| Tap Continue repeatedly as a copy update arrives | PASS | 7697 | 1234 | the name question → the name question | [video](../.excer/ota-lab/evidence/2026-10-02_21-49-18-rapid/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-49-18-rapid/result.json) |
| Tap Get started during page entry while an update arrives | PASS | 7986 | 1439 | the second Welcome explanation → the second Welcome explanation | [video](../.excer/ota-lab/evidence/2026-10-02_22-42-07-transition/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-42-07-transition/result.json) |
| Open while the update download is cut off halfway | PASS | 2277 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_21-51-34-cutoff/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-51-34-cutoff/result.json) |
| Open while the update has a corrupt asset | PASS | 2276 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_21-51-40-corrupt/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-51-40-corrupt/result.json) |
| Open an update that crashes before its first content | PASS | 2575 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-42-01-crash/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-42-01-crash/result.json) |
| Continue a question into an update that crashes before its first content | PASS | 7683 | 1236 | the name question → the name question (embedded recovery) | [video](../.excer/ota-lab/evidence/2026-10-02_22-35-28-crash-mid/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-35-28-crash-mid/result.json) |
| Continue while two updates arrive back to back | PASS | 8228 | 1373 | the name question → the name question | [video](../.excer/ota-lab/evidence/2026-10-02_21-56-53-two-updates/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-56-53-two-updates/result.json) |
| Reopen after a rollback directive to embedded code | PASS | 2320 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-05-21-rollback/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-05-21-rollback/result.json) |
| Background ExcerLock on the muscle follow-up, reopen, then continue | PASS | 8018 | 1508 | the fat follow-up → the fat follow-up | [video](../.excer/ota-lab/evidence/2026-10-02_21-58-02-background/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_21-58-02-background/result.json) |
| Force quit ExcerLock on the muscle follow-up, reopen, then continue | PASS | 8188 | — | the muscle follow-up → the muscle follow-up (new code, cold resume) | [video](../.excer/ota-lab/evidence/2026-10-02_22-36-33-kill/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-36-33-kill/result.json) |
| Interrupt and restore the update connection on the muscle follow-up, then continue | PASS | 8348 | — | the muscle follow-up stays visible; embedded Paywall afterwards | [video](../.excer/ota-lab/evidence/2026-10-02_22-04-15-network/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-04-15-network/result.json) |
| Reopen an existing install during a slow update download | PASS | 4887 | — | Welcome (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-43-18-returning/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-43-18-returning/result.json) |
| Finish onboarding and view the Paywall once on the new update | PASS | 8158 | 1378 | the name question → the name question | [video](../.excer/ota-lab/evidence/2026-10-02_22-05-41-analytics/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-05-41-analytics/result.json) |
| Finish onboarding offline and record the first embedded Paywall view | PASS | 8300 | — | the Paywall (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-06-49-analytics-embedded/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-06-49-analytics-embedded/result.json) |
| Reopen an older install and keep its Paywall view out of the new-install count | PASS | 4860 | — | the Paywall (embedded) | [video](../.excer/ota-lab/evidence/2026-10-02_22-07-52-analytics-legacy/video.mp4) · [result](../.excer/ota-lab/evidence/2026-10-02_22-07-52-analytics-legacy/result.json) |

## Failures and blocked verification

No unresolved failed or blocked case in the latest results. The initial 44-case matrix recorded 39 passes, three startup-timing failures and two blocked attempts. Focused reruns resolved all five.

- Continuing into a pre-content crash originally exited the app and reached the five-minute deadline: [original video](../.excer/ota-lab/evidence/2026-10-02_21-51-52-crash-mid/video.mp4). With the native recovery patch, it recovered to the expected name question without a manual reopen, recorded one native failed launch, and held the cover for 1,236 ms: [passing evidence](../.excer/ota-lab/evidence/2026-10-02_22-35-28-crash-mid/result.json).
- Force quitting on the muscle follow-up resumed correctly, but the original driver toggled selected body goals off after exercising Back and stalled: [original video](../.excer/ota-lab/evidence/2026-10-02_21-59-13-kill/video.mp4). The corrected driver preserves those selections: [passing evidence](../.excer/ota-lab/evidence/2026-10-02_22-36-33-kill/result.json).
- Walking, Setup and permission-prompt attempts exceeded the first-page threshold at 8,550, 8,533 and 8,572 ms respectively. Those original recordings remain under `2026-10-02_22-13-25-same-w2`, `2026-10-02_22-26-23-never-x1` and `2026-10-02_22-30-04-never-permission`. Earlier preparation and the handoff reserve passed their focused reruns; the table links each latest recording.
- Earlier pre-baseline runs exposed real blank launch/reload intervals. The native splash and overlay changes fixed the observed gaps; the final recordings retain continuous artwork. Automated pale-frame detection supports, but does not replace, the contact sheets and recordings.

## Config isolation

The [original production-config diff](../.excer/ota-lab/production-final-diff.json) contains only `.extra.onboardingFlowVersion`, required by the agreed version contract. The [final lab-isolation comparison](../.excer/ota-lab/production-lab-isolation-final.json) is byte-identical before and after local preparation, SHA-256 `374f3d4332679f0a1d04e2c72d9503e599c1ef48477ab779fea9afb95981ef90`. Update URL, channel, runtime and production native configuration remain unchanged. Literal identity with the original config conflicts with adding the required version field; this additive exception is explicit.

## Focused dev proofs

Each proof ran individually with a five-minute outer deadline on the assigned worker simulator, using the cached Debug binary and Metro 8092. Source: `bfab1d3d`; the only uncommitted workspace file was this report. No full development feature suite ran.

| What the tester does | Result | Evidence |
|---|---|---|
| Cold reopen with an unknown saved page and require the unfinished muscle follow-up | PASS | [result](../.excer/proof/onboarding/2026-10-02_22-44-23/result.json) · [screenshot](../.excer/proof/onboarding/2026-10-02_22-44-23/renamed-page-resumes-at-unfinished-follow-up.png) |
| Cold reopen a Walking page without an activity answer and require the activity choice | PASS | [result](../.excer/proof/onboarding/2026-10-02_22-45-24/result.json) · [screenshot](../.excer/proof/onboarding/2026-10-02_22-45-24/resume-requires-activity-answer.png) |
| Inspect reload denials for Paywall, Sign in, a question, Setup and permission prompts | PASS | [result](../.excer/proof/onboarding/2026-10-02_22-46-03/result.json) · [screenshot](../.excer/proof/onboarding/2026-10-02_22-46-03/ota-denials-panel.png) |

## Static verification

Command: `EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer check`. Exact output, also saved in [check-final.txt](../.excer/ota-lab/check-final.txt):

```text
✓ typecheck 6.2s
✓ lint 1.7s
✓ no-tests 0.0s
✓ no-comments 1.5s  0 / ceiling 0
✓ updates-owner 0.0s
✓ onboarding-flow-version 0.0s
✓ analytics-emitter 0.0s
✓ flag-registry 0.0s
✓ shield-copy-parity 0.0s
✓ research-isolation 0.0s
✓ raw-colours 0.0s  0 / ceiling 0
✓ raw-type 0.0s  0 / ceiling 0
✓ illustration-tokens 0.0s  30 / ceiling 30
✓ dependency-rules 2.3s  0 / ceiling 0
✓ unemitted-events 0.0s  16 / ceiling 16
✓ dependency-floors 0.0s
✓ sentry-core 0.0s  10.37.0
✓ ci-pinned 0.0s
✓ deploy-host-key 0.0s
✓ agent-layout 0.0s
✓ feature-map 0.0s  15 features

21 checks passed
```

## Open risks and decisions

- The lab runs real native Updates with fake identity, StoreKit, permission and sensor ports. Actual provider sheets, purchases and a physical-device release have not been verified. Local transport interruption models the Updates connection, not device-wide Wi-Fi switching.
- Build 18 must include the pinned expo-updates iOS patch. OTA JavaScript cannot add it to build 17, whose original native handoff and recovery were not verified by this final lab binary. Runtime 4 stays compatible through the internal-native-fix exception in ADR 0060; Expo upgrades require revisiting the patch and private Router entry helpers.
- Expo’s automatic recovery covers a crash before first content. A cover is itself first content, so later crashes are outside that guarantee. The crash fixture throws before root registration.
- First open is approximately eight seconds, not a hard real-time limit. The final native first-cover dismissal reached 8.495 seconds. Expo’s controller timestamp has one-second resolution; a late admitted reload or slower real-service hydration can extend the budget. Earlier load-heavy attempts reached 8.81 seconds and remain failed historical attempts. The lab uses explicit 8.5-second startup and 2-second reload-cover thresholds; it does not establish an exact eight-second ceiling on physical devices.
- “Newest Paywall” means a usable update downloaded before its final safe handoff. Offline, corrupted, crashing, later publications and the one-reload limit cannot provide an absolute newest-code guarantee. A changed flow that requires new answers needs a compatible migration before explicit Paywall handoff.
- No additional product-rule decision is requested. Any future publishing or release action remains a separate authorized task.

## Cleanup

The owned loopback server on 8098 and Metro on 8092 were stopped. The assigned hidden worker simulator remains booted with the cached Debug app installed. All commits remain on `JohanSardar/ota-first-launch`; nothing was pushed, merged, uploaded or published.
